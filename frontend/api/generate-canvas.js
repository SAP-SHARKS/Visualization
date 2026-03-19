/**
 * Vercel serverless function — analyzes a transcript and generates
 * a rich meeting canvas with multiple visual types using Claude API.
 *
 * Supports two modes:
 * - Legacy mode (default): uses hardcoded visual type schemas
 * - Template mode (useTemplates: true): fetches templates from Supabase,
 *   runs 5-step selection pipeline
 */

import { fetchActiveTemplates, isServerSupabaseConfigured, recordTemplateUsages } from './lib/supabaseServer.js'
import { buildCanvasPrompt } from './lib/promptBuilder.js'

// ── Legacy system prompt (backward-compatible) ───────────
const SYS = `You are a meeting intelligence AI for corporate, technical, and product/strategy meetings. Analyze the transcript and return a rich canvas as JSON.

RESPOND ONLY WITH VALID JSON — no markdown, no backticks, nothing outside the JSON object.

Schema:
{
  "title": "Short descriptive meeting title (max 8 words, punchy headline)",
  "subtitle": "One sentence summary of what was discussed and why it matters",
  "visuals": [ /* ordered array of 4-7 visual sections */ ],
  "decisions": [ { "status": "MADE|PENDING|TABLED", "text": "..." } ],
  "actions": [ { "text": "...", "owner": "name if mentioned, else empty string" } ],
  "steps": [ { "number": 1, "heading": "2-3 words", "description": "max 15 words", "icon_hint": "simple icon name e.g. smartphone, bank building, clock" } ],
  "stats": [ { "value": "e.g. 34%", "label": "metric name", "context": "brief context" } ]
}

INFOGRAPHIC DATA RULES:
- "steps": Extract 4-6 key steps, processes, or phases from the transcript. Each step must have number, heading (2-3 words), description (max 15 words), and icon_hint.
- "stats": Extract any key numbers, percentages, KPIs, or metrics mentioned. Each stat has value, label, and context.
- ALWAYS include both "steps" and "stats" arrays even if empty.

VISUAL SELECTION RULES — follow these in order:
1. ALWAYS include these 3: "takeaways", "eli5", "blindspots"
2. If there is a process, sequence of steps, or if/then logic → include "flowchart"
3. If there is NO flowchart → include BOTH "mindmap" AND "problemsolution" as the primary visuals
4. If a debate or trade-off is being discussed → include "proscons"
5. If 2 or more options are being compared on attributes → include "comparison"
6. If dates, phases, or a schedule is discussed → include "timeline"
7. If specific numbers, KPIs, or metrics are mentioned → include "metrics"
8. If technical jargon, acronyms, or domain terms are used → include "terms"
9. Total visuals: 4 minimum, 7 maximum

EVERY visual section object MUST include an "explanation" string: 1-3 sentences of genuine insight that tells the reader what to make of this visual — not just a description of it.

Visual type schemas:

TYPE "takeaways":
{ "type":"takeaways", "items":[{"text":"...","highlight":false}], "explanation":"..." }
3-5 items. Set highlight:true on EXACTLY ONE — the most critical.

TYPE "eli5":
{ "type":"eli5", "simple":"2-3 plain sentences for someone who just walked in", "analogy":"real-world analogy or empty string", "explanation":"..." }

TYPE "blindspots":
{ "type":"blindspots", "items":[{"question":"specific unanswered question","note":"why this gap is risky"}], "explanation":"..." }
2-4 items. Be specific — not generic like "more research needed".

TYPE "flowchart":
{ "type":"flowchart", "mermaid":"graph TD\\n  A[Step] --> B{Decision?}\\n  B -->|Yes| C[Action]\\n  B -->|No| D[Other]", "caption":"one sentence", "explanation":"..." }
Max 10 nodes. Node labels under 6 words. Always graph TD.

TYPE "mindmap":
{ "type":"mindmap", "title":"string", "root":{"label":"Core meeting topic","children":[{"label":"Theme","children":[{"label":"detail"},{"label":"detail"}]}]}, "explanation":"..." }
4-6 branches. Each node has "label" and optional "children" array.

TYPE "problemsolution":
{ "type":"problemsolution", "problems":["specific problem 1","specific problem 2"], "solutions":["proposed fix 1","proposed fix 2"], "explanation":"..." }
Match problems to solutions where possible. Be specific.

TYPE "proscons":
{ "type":"proscons", "topic":"what is being weighed", "pros":["..."], "cons":["..."], "explanation":"..." }

TYPE "comparison":
{ "type":"comparison", "options":["Option A","Option B"], "criteria":[{"name":"Criterion","values":["val1","val2"]}], "explanation":"..." }
3-6 criteria rows.

TYPE "timeline":
{ "type":"timeline", "items":[{"time":"Q1 2025","event":"what happened/happens","note":"optional context","done":false}], "explanation":"..." }

TYPE "metrics":
{ "type":"metrics", "items":[{"value":"$2.4M","name":"REVENUE","context":"↑34% QoQ","color":"#00ff88"}], "explanation":"..." }
3-6 cards. Colors: green=#00ff88 for good, red=#ff5050 for bad, cyan=#00d4ff for neutral.

TYPE "terms":
{ "type":"terms", "items":[{"term":"TERM","definition":"plain English definition in 1-2 sentences"}], "explanation":"..." }
2-6 items. Prioritize terms a non-expert would not know.`

// ── Pre-filter: score templates against transcript keywords ──

function preFilterTemplates(templates, transcript) {
  const lower = transcript.toLowerCase()
  const words = new Set(lower.split(/\s+/))

  return templates.map(t => {
    let score = 0
    for (const signal of (t.trigger_signals || [])) {
      const ls = signal.toLowerCase()
      if (ls.includes(' ')) {
        if (lower.includes(ls)) score += 3
      } else {
        if (words.has(ls)) score += 2
        else if (lower.includes(ls)) score += 1
      }
    }
    if (t.category === 'always') score += 10
    return { ...t, _score: score }
  }).filter(t => t._score > 0).sort((a, b) => b._score - a._score)
}

// ── Confidence gating ────────────────────────────────────

function applyConfidenceGating(visuals) {
  return visuals.filter(v => {
    const conf = v.confidence || 0
    if (conf < 60) return false // suppress
    if (conf < 75) v._warning = true // warn
    return true
  })
}

// ── Deduplication ────────────────────────────────────────

function deduplicateVisuals(visuals, templateMap) {
  const seen = new Set()
  const result = []
  const categoryCounts = {}

  for (const v of visuals) {
    const slug = v.template_slug
    if (seen.has(slug)) continue
    seen.add(slug)

    // Category variety: max 2 from the same category
    const tmpl = templateMap.get(slug)
    if (tmpl) {
      const cat = tmpl.category
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      if (cat !== 'always' && categoryCounts[cat] > 2) continue
    }

    result.push(v)
  }
  return result
}

// ── Main handler ─────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })

  const { text, useTemplates } = req.body || {}
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Transcript text is required' })
  }

  // ── Template mode ──────────────────────────────────────
  if (useTemplates && isServerSupabaseConfigured()) {
    const pipelineStart = Date.now()
    const pipelineLog = []
    const logStep = (step, detail) => pipelineLog.push({ step, detail, ts: Date.now() - pipelineStart })

    try {
      // Step 1: Fetch active templates from Supabase
      logStep('FETCH_TEMPLATES', { status: 'started' })
      const allTemplates = await fetchActiveTemplates()
      logStep('FETCH_TEMPLATES', {
        status: 'done',
        totalTemplates: allTemplates.length,
        categories: [...new Set(allTemplates.map(t => t.category))],
      })

      if (allTemplates.length === 0) {
        logStep('FALLBACK', { reason: 'No templates in DB, using legacy mode' })
        return legacyGenerate(apiKey, text, res, pipelineLog)
      }

      // Step 2: Separate always-included vs selectable templates
      const ALWAYS_SLUGS = new Set(['eli5', 'takeaways', 'blindspots'])
      const alwaysTemplates = allTemplates.filter(t => ALWAYS_SLUGS.has(t.slug))
      const selectableTemplates = allTemplates.filter(t => !ALWAYS_SLUGS.has(t.slug))
      const templateMap = new Map(allTemplates.map(t => [t.slug, t]))

      logStep('SPLIT', {
        alwaysCount: alwaysTemplates.length,
        alwaysSlugs: alwaysTemplates.map(t => t.slug),
        selectableCount: selectableTemplates.length,
      })

      // Step 3: Pre-filter ONLY selectable templates against transcript keywords
      logStep('PRE_FILTER', { status: 'started', inputCount: selectableTemplates.length })
      const candidates = preFilterTemplates(selectableTemplates, text)
      logStep('PRE_FILTER', {
        status: 'done',
        candidateCount: candidates.length,
        topCandidates: candidates.slice(0, 10).map(c => ({ slug: c.slug, score: c._score, category: c.category })),
        droppedCount: selectableTemplates.length - candidates.length,
      })

      // Step 4: Build dynamic prompt and call Claude LLM
      // Always templates are sent separately — LLM must fill them, not select them
      logStep('LLM_SELECT', { status: 'started', model: 'claude-sonnet-4-20250514', candidatesSent: candidates.length, alwaysIncluded: alwaysTemplates.length })
      const systemPrompt = buildCanvasPrompt(candidates, alwaysTemplates)
      const userMessage = `Here is the complete transcript to analyze:\n\n${text.trim()}\n\nAnalyze this transcript and return a rich meeting canvas as JSON. You MUST fill the always-included sections (eli5, takeaways, blindspots). Then select 3-5 additional templates from the candidates and fill their schemas.\n\nAdditionally, analyze this transcript and extract key information formatted specifically for an infographic. Include in the JSON response:\n- title: A punchy headline (max 8 words)\n- subtitle: One supporting line\n- steps: Array of 4-6 steps, each with: number, heading (2-3 words), description (max 15 words), icon_hint (suggest a simple icon, e.g. "smartphone", "bank building")\n- stats: Any key numbers or metrics worth highlighting`

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) logStep('LLM_RETRY', { attempt: attempt + 1, reason: 'Invalid JSON on previous attempt' })

          const prompt = attempt === 0
            ? systemPrompt
            : systemPrompt + '\n\nCRITICAL: Your previous response was not valid JSON. Return ONLY valid JSON.'

          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 100000)

          const llmStart = Date.now()
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 8192,
              system: prompt,
              messages: [{ role: 'user', content: userMessage }],
            }),
            signal: controller.signal,
          })

          clearTimeout(timeout)

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            logStep('LLM_SELECT', { status: 'error', httpStatus: response.status, error: errData.error?.message })
            return res.status(502).json({
              error: errData.error?.message || `Claude API error (${response.status})`,
              _pipeline: { log: pipelineLog },
            })
          }

          const data = await response.json()
          const rawText = data.content?.[0]?.text || ''
          const llmMs = Date.now() - llmStart

          logStep('LLM_SELECT', {
            status: 'done',
            llmTimeMs: llmMs,
            inputTokens: data.usage?.input_tokens,
            outputTokens: data.usage?.output_tokens,
            responseLength: rawText.length,
          })

          let jsonStr = rawText.trim()
          if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
          }

          const parsed = JSON.parse(jsonStr)
          if (!parsed || !Array.isArray(parsed.visuals) || parsed.visuals.length === 0) {
            throw new Error('Invalid response: expected {visuals: [...]}')
          }

          const rawVisuals = parsed.visuals
          logStep('LLM_RESULT', {
            visualsReturned: rawVisuals.length,
            slugs: rawVisuals.map(v => v.template_slug || v.type),
            confidences: rawVisuals.map(v => ({ slug: v.template_slug || v.type, confidence: v.confidence })),
          })

          // Step 4: Confidence gating
          logStep('CONFIDENCE_GATE', { status: 'started', inputCount: rawVisuals.length, threshold: { suppress: 60, warn: 75 } })
          let visuals = applyConfidenceGating(rawVisuals)
          const suppressed = rawVisuals.filter(v => (v.confidence || 0) < 60)
          const warned = visuals.filter(v => v._warning)
          logStep('CONFIDENCE_GATE', {
            status: 'done',
            passed: visuals.length,
            suppressed: suppressed.map(v => ({ slug: v.template_slug || v.type, confidence: v.confidence })),
            warned: warned.map(v => ({ slug: v.template_slug || v.type, confidence: v.confidence })),
          })

          // Step 5: Deduplication & variety check
          const beforeDedup = visuals.length
          logStep('DEDUP', { status: 'started', inputCount: beforeDedup })
          visuals = deduplicateVisuals(visuals, templateMap)
          logStep('DEDUP', {
            status: 'done',
            outputCount: visuals.length,
            removed: beforeDedup - visuals.length,
            finalSlugs: visuals.map(v => v.template_slug || v.type),
          })

          // Record usage (non-blocking)
          const selectionTimeMs = Date.now() - pipelineStart
          const usages = visuals
            .filter(v => v.template_id)
            .map(v => ({
              template_id: v.template_id,
              session_id: null,
              confidence_score: v.confidence || null,
              selection_time_ms: selectionTimeMs,
            }))
          recordTemplateUsages(usages).catch(() => {})

          logStep('COMPLETE', {
            totalTimeMs: selectionTimeMs,
            finalVisualCount: visuals.length,
            mode: 'template',
          })

          return res.status(200).json({
            title: parsed.title || 'Untitled',
            subtitle: parsed.subtitle || '',
            visuals,
            infographic_data: parsed.steps || parsed.stats ? {
              title: parsed.title || 'Untitled',
              subtitle: parsed.subtitle || '',
              steps: parsed.steps || [],
              stats: parsed.stats || [],
            } : null,
            _pipeline: {
              mode: 'template',
              candidateCount: candidates.length,
              selectedCount: visuals.length,
              timeMs: selectionTimeMs,
              log: pipelineLog,
            },
          })
        } catch (err) {
          if (err.name === 'AbortError') {
            logStep('LLM_SELECT', { status: 'timeout' })
            return res.status(504).json({ error: 'Claude API request timed out', _pipeline: { log: pipelineLog } })
          }
          if (attempt === 0 && (err instanceof SyntaxError || err.message?.includes('visuals'))) {
            logStep('LLM_PARSE', { status: 'failed', error: err.message, willRetry: true })
            continue
          }
          logStep('ERROR', { error: err.message })
          return res.status(500).json({
            error: `Failed to generate canvas: ${err.message}`,
            _pipeline: { log: pipelineLog },
          })
        }
      }

      logStep('ERROR', { error: 'Failed after 2 attempts' })
      return res.status(500).json({ error: 'Failed to generate valid canvas after retry', _pipeline: { log: pipelineLog } })
    } catch (err) {
      logStep('FALLBACK', { reason: `Pipeline error: ${err.message}`, fallback: 'legacy' })
      console.error('Template pipeline error, falling back to legacy:', err)
      return legacyGenerate(apiKey, text, res, pipelineLog)
    }
  }

  // ── Legacy mode (default) ──────────────────────────────
  return legacyGenerate(apiKey, text, res)
}

async function legacyGenerate(apiKey, text, res, pipelineLog = []) {
  pipelineLog.push({ step: 'LEGACY_MODE', detail: { reason: 'Using hardcoded 11-type system' }, ts: 0 })
  const userMessage = `Here is the complete transcript to analyze:\n\n${text.trim()}\n\nAnalyze this transcript and return a rich meeting canvas as JSON with title, subtitle, visuals array (4-7 items), decisions array, and actions array.\n\nAdditionally, analyze this transcript and extract key information formatted specifically for an infographic. Include in the JSON response:\n- title: A punchy headline (max 8 words)\n- subtitle: One supporting line\n- steps: Array of 4-6 steps, each with: number, heading (2-3 words), description (max 15 words), icon_hint (suggest a simple icon, e.g. "smartphone", "bank building")\n- stats: Any key numbers or metrics worth highlighting`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const systemPrompt = attempt === 0
        ? SYS
        : SYS + '\n\nCRITICAL: Your previous response was not valid JSON. Return ONLY valid JSON. No markdown. No code fences.'

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 100000)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        return res.status(502).json({
          error: errData.error?.message || `Claude API error (${response.status})`,
        })
      }

      const data = await response.json()
      const rawText = data.content?.[0]?.text || ''

      let jsonStr = rawText.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      }

      const parsed = JSON.parse(jsonStr)

      if (!parsed || !Array.isArray(parsed.visuals) || parsed.visuals.length === 0) {
        throw new Error('Invalid response: expected {visuals: [...]}')
      }

      return res.status(200).json({
        title: parsed.title || 'Untitled',
        subtitle: parsed.subtitle || '',
        visuals: parsed.visuals,
        decisions: parsed.decisions || [],
        actions: parsed.actions || [],
        infographic_data: parsed.steps || parsed.stats ? {
          title: parsed.title || 'Untitled',
          subtitle: parsed.subtitle || '',
          steps: parsed.steps || [],
          stats: parsed.stats || [],
        } : null,
        _pipeline: { mode: 'legacy', log: pipelineLog },
      })
    } catch (err) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: 'Claude API request timed out' })
      }
      if (attempt === 0 && (err instanceof SyntaxError || err.message?.includes('visuals'))) {
        continue
      }
      return res.status(500).json({
        error: `Failed to generate canvas: ${err.message}`,
      })
    }
  }

  return res.status(500).json({ error: 'Failed to generate valid canvas after retry' })
}
