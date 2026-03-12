/**
 * Vercel serverless function — analyzes a transcript and generates
 * a rich meeting canvas with multiple visual types using Claude API.
 */

const SYS = `You are a meeting intelligence AI for corporate, technical, and product/strategy meetings. Analyze the transcript and return a rich canvas as JSON.

RESPOND ONLY WITH VALID JSON — no markdown, no backticks, nothing outside the JSON object.

Schema:
{
  "title": "Short descriptive meeting title",
  "subtitle": "One sentence summary of what was discussed and why it matters",
  "visuals": [ /* ordered array of 4-7 visual sections */ ],
  "decisions": [ { "status": "MADE|PENDING|TABLED", "text": "..." } ],
  "actions": [ { "text": "...", "owner": "name if mentioned, else empty string" } ]
}

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
{ "type":"mindmap", "center":"Core meeting topic", "color":"#26de81", "branches":[{"label":"Theme","children":["detail","detail"]}], "explanation":"..." }
4-6 branches. Good colors: #26de81 #00d4ff #c77dff #ff9f43 #ffd93d

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })

  const { text } = req.body || {}
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Transcript text is required' })
  }

  const userMessage = `Here is the complete transcript to analyze:\n\n${text.trim()}\n\nAnalyze this transcript and return a rich meeting canvas as JSON with title, subtitle, visuals array (4-7 items), decisions array, and actions array.`

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
