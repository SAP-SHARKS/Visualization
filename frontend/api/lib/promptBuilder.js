/**
 * Dynamic prompt builder — constructs Claude system prompts from templates.
 * The AI only sees template names, schemas, and patterns — never HTML.
 */

/**
 * Build a compact schema summary from a JSON Schema object.
 */
function summarizeSchema(schema) {
  if (!schema || !schema.properties) return '{}'
  const fields = Object.entries(schema.properties).map(([key, val]) => {
    let type = val.type || 'any'
    if (type === 'array' && val.items) {
      if (val.items.type === 'object' && val.items.properties) {
        const inner = Object.keys(val.items.properties).join(', ')
        type = `array of {${inner}}`
      } else {
        type = `array of ${val.items.type || 'any'}`
      }
    }
    const desc = val.description ? ` — ${val.description}` : ''
    const constraints = []
    if (val.minItems) constraints.push(`min ${val.minItems}`)
    if (val.maxItems) constraints.push(`max ${val.maxItems}`)
    const constraintStr = constraints.length ? ` (${constraints.join(', ')})` : ''
    return `  "${key}": ${type}${constraintStr}${desc}`
  })
  return `{\n${fields.join(',\n')}\n}`
}

/**
 * Build the canvas-mode system prompt from candidate + always-included templates.
 *
 * @param {Array} candidates - Pre-filtered selectable template objects
 * @param {Array} alwaysTemplates - Templates that must always be filled (eli5, takeaways, blindspots)
 * @returns {string} Complete system prompt
 */
export function buildCanvasPrompt(candidates, alwaysTemplates = []) {
  const alwaysDescriptions = alwaysTemplates.map(t => {
    return `TEMPLATE "${t.slug}" (${t.name}):
  Schema: ${summarizeSchema(t.schema)}`
  }).join('\n\n')

  const candidateDescriptions = candidates.map(t => {
    return `TEMPLATE "${t.slug}" (${t.name}):
  Category: ${t.category}
  When to use: ${t.conversation_pattern || 'General use'}
  Data points: ${t.min_data_points}-${t.max_data_points}
  Schema: ${summarizeSchema(t.schema)}`
  }).join('\n\n')

  return `You are a meeting intelligence AI for corporate, technical, and product/strategy meetings. Analyze the transcript and return a rich canvas as JSON.

RESPOND ONLY WITH VALID JSON — no markdown, no backticks, nothing outside the JSON object.

IMPORTANT: The AI never generates HTML. You only fill JSON schemas for selected templates.

=== ALWAYS-INCLUDED SECTIONS (you MUST fill these every time) ===

${alwaysDescriptions}

=== CANDIDATE TEMPLATES (select 3-5 from these based on transcript content) ===

${candidateDescriptions}

=== RULES ===
1. You MUST include eli5, takeaways, and blindspots in every response — these are non-negotiable.
2. From the candidate templates, select 3-5 that best match the transcript content.
3. For each template (always + selected), fill its schema with data extracted from the transcript.
4. Include a confidence score (0-100) for each selected candidate (always sections get confidence: 100).
5. Include an "explanation" (1-3 sentences of genuine insight) for every visual.
6. Total visuals: always sections + selected candidates = 6-8 total.

=== OUTPUT FORMAT ===
{
  "title": "Short descriptive meeting title (max 8 words, punchy headline)",
  "subtitle": "One sentence summary of what was discussed and why it matters",
  "visuals": [
    {
      "template_id": "uuid from the template",
      "template_slug": "slug string",
      "confidence": 100,
      "schema_data": { ...filled schema for this template... },
      "explanation": "1-3 sentences of genuine insight"
    }
  ],
  "steps": [
    { "number": 1, "heading": "2-3 words", "description": "max 15 words", "icon_hint": "simple icon name e.g. smartphone, bank building, clock" }
  ],
  "stats": [
    { "value": "e.g. 34%", "label": "metric name", "context": "brief context" }
  ]
}

INFOGRAPHIC DATA RULES:
- "steps": Extract 4-6 key steps, processes, or phases from the transcript. Each step must have number, heading, description, and icon_hint.
- "stats": Extract any key numbers, percentages, KPIs, or metrics mentioned. Each stat has value, label, and context.
- ALWAYS include both "steps" and "stats" arrays even if empty.

NOTE: Do NOT include separate "decisions" or "actions" fields. If decisions or action items exist in the transcript, select the "decision_log" and/or "action_items" templates from the candidates.`
}

/**
 * Build the live-mode system prompt from templates + chart registry.
 * This extends the existing ANALYSIS_PROMPT pattern with template awareness.
 *
 * @param {Array} candidates - Pre-filtered template objects (for chart types)
 * @returns {string} Complete system prompt for live analysis
 */
export function buildLivePrompt(candidates) {
  const chartTemplates = candidates.filter(t => t.category !== 'always')

  const schemaBlock = chartTemplates.map(t => {
    return `${t.slug}: ${summarizeSchema(t.schema)}
  When to use: ${t.conversation_pattern || ''}`
  }).join('\n')

  return `You are a real-time meeting intelligence AI. Analyze this meeting transcript and return a JSON response.

RESPOND ONLY WITH VALID JSON — no markdown, no backticks.

=== CONTEXT YOU RECEIVE ===
1. PREVIOUS SUMMARY — compressed record of everything discussed before.
2. CHART REGISTRY — compact list of all charts already on canvas {chartId, type, topicSummary}.
3. RECENT TRANSCRIPT — the last ~300 words being discussed right now.

=== CHARTS ARRAY ===

Return a "charts" array with 1-4 chart objects. Each has an "action" field:

UPDATE: {"action":"update","chartId":"<existing id>","topicSummary":"2-6 words","type":"<same type>", ...fullChartData}
NEW:    {"action":"new","chartId":"chart_<timestamp>","topicSummary":"2-6 words","type":"<type>", ...fullChartData}

CHART RULES:
- Check registry FIRST — do NOT create a NEW chart if a similar type + topic already exists
- If registry has a matching chart → UPDATE it, do not duplicate
- Pick DIFFERENT types for different aspects of the content
- Every chart MUST have "title" and "explanation" (1-2 sentences of genuine insight)
- When using template system, include "template_slug" and put data in "schema_data"

=== AVAILABLE CHART TEMPLATES ===
${schemaBlock}

=== ALWAYS-PRESENT FIELDS (every response) ===

"currentTopic": "5-8 word summary of what is being discussed RIGHT NOW"
"eli5Now": "1-2 plain sentences for someone who just looked up"
"takeawaysNow": [{"text":"...","highlight":false}] — 2-3 items, highlight:true on most important

"summary": {
  "text": "comprehensive summary of ENTIRE meeting so far",
  "keyTakeaways": [{"text":"...","highlight":false}],
  "blindspots": [{"question":"...","note":"why this matters"}]
}

"decisions": [{"status":"MADE|PENDING|TABLED","text":"..."}]
"actions": [{"text":"...","owner":""}]

=== OUTPUT FORMAT ===
{
  "currentTopic": "...",
  "eli5Now": "...",
  "takeawaysNow": [...],
  "summary": { "text":"...", "keyTakeaways":[...], "blindspots":[...] },
  "decisions": [...],
  "actions": [...],
  "charts": [...]
}`
}
