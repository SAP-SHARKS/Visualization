/**
 * Vercel serverless function — analyzes a complete transcript and generates
 * multiple meaningful charts (one per key topic) using Claude API.
 * Also returns transformed transcript text per chart for Napkin AI generation.
 */

const SYSTEM_PROMPT = `You are an expert data visualization engine. You receive a COMPLETE transcript and must analyze it to produce multiple meaningful charts that together help a reader fully understand the transcript at a glance.

=== YOUR TASK ===

1. Read the entire transcript carefully
2. Identify 1-8 KEY TOPICS or themes discussed (don't create charts for greetings, filler, or meta-conversation)
3. For each topic, create the BEST chart type to visualize it
4. Return an array of chart objects

=== CHART TYPE SELECTION ===

Pick the BEST match for each topic:

Process, workflow, steps, how-to, cause-effect, architecture → mermaid_flowchart
People or system interactions, request/response → mermaid_sequence
Dates, milestones, roadmap, chronological events → timeline
Comparisons, pros/cons, trade-offs → comparison
Topic breakdown, brainstorming, categories → mindmap
When 3+ numbers or percentages appear → infographic

=== ONE CHART PER TOPIC ===

Each chart MUST cover a DIFFERENT topic or theme from the transcript.

NEVER create multiple charts for the same topic.
Do NOT split one topic into "process view", "component view", "timeline view", etc.
Pick the ONE best chart type for each topic and move on.

If the transcript only discusses 1-2 topics, return only 1-2 charts. Do NOT inflate the count.

=== VARIETY RULE ===

Use DIFFERENT chart types across charts when the topics naturally call for it. Do NOT force variety by splitting one topic into multiple chart types.

=== CHART SIZE LIMITS ===

flowchart → 3-9 nodes
timeline → 3-7 events
mindmap → 4-6 branches
comparison → 2-4 items
sequence → 3-6 steps
infographic → 6-8 metrics

=== CHART QUALITY ===

Each chart must be a standalone summary of its topic.
Someone should understand the topic within 5 seconds.

Rules:
- Use real terms, systems, and concepts from the transcript
- Avoid placeholders like "Step 1", "Item A"
- Prefer meaningful descriptive labels
- Each chart needs a clear, descriptive title

=== TRANSFORMED TRANSCRIPT ===

Each chart MUST include a "transformedTranscript" field.
This is a clean, well-structured rewrite of the relevant transcript portion.

Rules:
- ALWAYS write in English, regardless of the transcript language
- Remove filler words, repetition, and conversational noise
- Consolidate related ideas
- Preserve key facts, names, numbers, and technical details
- Write in clear professional prose
- Optimized for generating visuals (this text will be sent to Napkin AI)
- 2-5 sentences typically sufficient

=== NAPKIN VISUAL TYPE ===

Each chart MUST include a "napkinVisualType" field.
This tells Napkin AI what kind of visual to generate.

Mapping:
mermaid_flowchart → "flowchart"
mermaid_sequence → "sequence diagram"
timeline → "timeline"
comparison → "comparison table"
mindmap → "mind map"
infographic → "infographic"

=== LANGUAGE RULE ===

ALL output MUST be in English — titles, labels, mermaidCode, topicSummary, transformedTranscript.
Even if the transcript is in another language, translate everything to English.

=== JSON SCHEMAS ===

MERMAID FLOWCHART:
{"type":"mermaid_flowchart","title":"string","mermaidCode":"graph TD\\n  A[Start] --> B{Decision}\\n  B -->|Yes| C[Process]\\n  B -->|No| D[End]","transformedTranscript":"string","topicSummary":"2-6 words","napkinVisualType":"flowchart"}

MERMAID SEQUENCE:
{"type":"mermaid_sequence","title":"string","mermaidCode":"sequenceDiagram\\n  participant A as User\\n  participant B as Server\\n  A->>B: Request\\n  B-->>A: Response","transformedTranscript":"string","topicSummary":"2-6 words","napkinVisualType":"sequence diagram"}

TIMELINE:
{"type":"timeline","title":"string","events":[{"date":"string","title":"string","description":"string","icon":"optional emoji"}],"transformedTranscript":"string","topicSummary":"2-6 words","napkinVisualType":"timeline"}

COMPARISON:
{"type":"comparison","title":"string","items":[{"name":"string","description":"optional","pros":["string"],"cons":["string"],"stats":[{"label":"string","value":"string or number"}]}],"transformedTranscript":"string","topicSummary":"2-6 words","napkinVisualType":"comparison table"}

INFOGRAPHIC:
{"type":"infographic","title":"string","subtitle":"optional","sections":[{"heading":"string","value":"string","description":"string","icon":"chart|users|globe|rocket|shield|zap|heart|star|target|clock"}],"footer":"optional","transformedTranscript":"string","topicSummary":"2-6 words","napkinVisualType":"infographic"}

MINDMAP:
{"type":"mindmap","title":"string","root":{"label":"string","children":[{"label":"string","children":[{"label":"string"}]}]},"transformedTranscript":"string","topicSummary":"2-6 words","napkinVisualType":"mind map"}

=== OUTPUT FORMAT ===

Return a JSON object with a "charts" array:
{"charts": [ ...chart objects... ]}

Return ONLY valid JSON. No markdown. No explanation. No code fences.`

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

  const userMessage = `Here is the complete transcript to analyze and visualize:\n\n${text.trim()}\n\nAnalyze this transcript. Create exactly ONE chart per distinct topic discussed. If only 1-2 topics exist, return only 1-2 charts. Do NOT create multiple charts for the same topic. Return {"charts": [...]}`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const systemPrompt = attempt === 0
        ? SYSTEM_PROMPT
        : SYSTEM_PROMPT + '\n\nCRITICAL: Your previous response was not valid JSON. Return ONLY valid JSON. No markdown. No code fences.'

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)

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

      if (!parsed || !Array.isArray(parsed.charts) || parsed.charts.length === 0) {
        throw new Error('Invalid response: expected {charts: [...]}')
      }

      // Validate each chart has required fields
      const validCharts = parsed.charts.filter(c => c && c.type && c.title)

      if (validCharts.length === 0) {
        throw new Error('No valid charts in response')
      }

      return res.status(200).json({ charts: validCharts })
    } catch (err) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: 'Claude API request timed out' })
      }
      if (attempt === 0 && (err instanceof SyntaxError || err.message?.includes('type') || err.message?.includes('charts'))) {
        continue
      }
      return res.status(500).json({
        error: `Failed to generate visuals: ${err.message}`,
      })
    }
  }

  return res.status(500).json({ error: 'Failed to generate valid chart data after retry' })
}
