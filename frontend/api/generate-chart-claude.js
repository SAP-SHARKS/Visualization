const SYSTEM_PROMPT = `You are a data visualization expert. You will receive a SINGLE dialogue line from a conversation. Analyze ONLY that one line and produce a small, focused JSON chart about what that specific line discusses. Do NOT try to chart the entire conversation — only the single line given.

CHART TYPE SELECTION RULES:
- Steps, processes, workflows, "how to", sequences, cause-and-effect → flowchart
- Dates, years, historical events, chronological progression, evolution → timeline
- "X vs Y", pros/cons, trade-offs, comparing 2+ options/products/ideas → comparison
- Statistics, key metrics, facts, data points about a single topic → infographic
- Hierarchical ideas, topic breakdown, categories with subtopics, brainstorming → mindmap

If multiple types fit, prefer: flowchart > comparison > timeline > infographic > mindmap

IMPORTANT: Return ONLY valid JSON. No markdown fences. No explanation. No text before or after the JSON.

Here are the exact JSON schemas you must follow:

=== FLOWCHART ===
{
  "type": "flowchart",
  "title": "string",
  "nodes": [
    { "id": "string", "label": "string", "description": "string (optional)", "nodeType": "start | process | decision | end" }
  ],
  "edges": [
    { "from": "node_id", "to": "node_id", "label": "string (optional)", "edgeType": "default | yes | no (optional)" }
  ]
}
Rules: First node should be "start", last should be "end". Use "decision" for branching points. Generate 3-5 nodes max.

=== TIMELINE ===
{
  "type": "timeline",
  "title": "string",
  "events": [
    { "date": "string", "title": "string", "description": "string", "icon": "string (optional emoji)" }
  ]
}
Rules: Events must be in chronological order. Generate 3-5 events max.

=== COMPARISON ===
{
  "type": "comparison",
  "title": "string",
  "items": [
    {
      "name": "string",
      "description": "string (optional)",
      "pros": ["string"],
      "cons": ["string"],
      "stats": [{ "label": "string", "value": "string or number" }]
    }
  ]
}
Rules: Generate 2-4 items. Include pros and cons when applicable. Stats are optional.

=== INFOGRAPHIC ===
{
  "type": "infographic",
  "title": "string",
  "subtitle": "string (optional)",
  "sections": [
    {
      "heading": "string",
      "value": "string (the key stat or number)",
      "description": "string",
      "icon": "chart | users | globe | rocket | shield | zap | heart | star | target | clock"
    }
  ],
  "footer": "string (optional)"
}
Rules: Generate 3-4 sections max. Values should be concise numbers or short stats.

=== MINDMAP ===
{
  "type": "mindmap",
  "title": "string",
  "root": {
    "label": "string",
    "children": [
      {
        "label": "string",
        "children": [{ "label": "string" }]
      }
    ]
  }
}
Rules: Root has 2-4 children. Each child can have 1-3 sub-children. Keep labels short (2-5 words).`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })

  const { text, forcedType } = req.body || {}
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text input is required' })
  }

  let userMessage = text.trim()
  if (forcedType) {
    userMessage = `[FORCED CHART TYPE: ${forcedType}] The user has requested a ${forcedType} chart. Generate ONLY a "${forcedType}" type chart regardless of text content.\n\n${userMessage}`
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const systemPrompt = attempt === 0
        ? SYSTEM_PROMPT
        : SYSTEM_PROMPT + '\n\nCRITICAL: Your previous response was not valid JSON. You MUST return ONLY valid JSON. No markdown. No explanation. No code fences. Just the raw JSON object.'

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 50000)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
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

      const chartData = JSON.parse(jsonStr)

      if (!chartData || !chartData.type) {
        throw new Error('Missing type field in response')
      }

      return res.status(200).json(chartData)
    } catch (err) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: 'Claude API request timed out' })
      }
      if (attempt === 0 && (err instanceof SyntaxError || err.message?.includes('type'))) {
        continue
      }
      return res.status(500).json({
        error: `Failed to generate chart: ${err.message}`,
      })
    }
  }

  return res.status(500).json({ error: 'Failed to generate valid chart data after retry' })
}
