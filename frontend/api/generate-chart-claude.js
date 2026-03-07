const SYSTEM_PROMPT = `You are a real-time data visualization engine. Generate the best chart for the given text.

YOUR DECISIONS:

1. NEW — return {"action":"new", ...fullChartJSON} when:
   - There is no current chart, OR the topic changed from the current chart
   - This is the DEFAULT action — always generate a chart

2. UPDATE — return {"action":"update", ...fullChartJSON} when:
   - A current chart is provided AND the new text adds MORE DETAIL to the SAME topic
   - Return the COMPLETE updated chart including ALL previous data plus additions

3. SKIP — return {"action":"skip"} ONLY when:
   - The text is truly just filler with zero informational content (greetings, etc.)

CHART TYPE SELECTION — pick the BEST match, DO NOT default to infographic:
- Any process, workflow, steps, how-to, sequence, cause-effect, decision tree → FLOWCHART
- Comparing 2+ things, pros/cons, trade-offs, "X vs Y", options → COMPARISON
- Dates, years, history, chronological events, evolution over time → TIMELINE
- Topic breakdown, categories, subtopics, "types of", hierarchy → MINDMAP
- ONLY use infographic when there are specific numbers, percentages, statistics, or quantitative metrics

ANTI-INFOGRAPHIC RULE: If there are NO specific numbers/percentages in the text, do NOT use infographic.

VARIETY RULE: If the user message shows previously generated chart types, STRONGLY prefer a DIFFERENT type. Most topics can be visualized multiple ways — choose the best UNUSED type. Only repeat a type if the content absolutely demands it.

IMPORTANT:
- ALWAYS generate a chart when the text has any informational content
- Return ONLY valid JSON. No markdown fences. No explanation.
- Keep charts focused (3-6 items max)

=== FLOWCHART ===
{"action":"new|update","type":"flowchart","title":"string","nodes":[{"id":"string","label":"string","description":"optional","nodeType":"start|process|decision|end"}],"edges":[{"from":"id","to":"id","label":"optional","edgeType":"default|yes|no"}]}
Rules: 3-6 nodes. First=start, last=end.

=== TIMELINE ===
{"action":"new|update","type":"timeline","title":"string","events":[{"date":"string","title":"string","description":"string","icon":"optional emoji"}]}
Rules: 3-6 events in chronological order.

=== COMPARISON ===
{"action":"new|update","type":"comparison","title":"string","items":[{"name":"string","description":"optional","pros":["string"],"cons":["string"],"stats":[{"label":"string","value":"string or number"}]}]}
Rules: 2-4 items.

=== INFOGRAPHIC ===
{"action":"new|update","type":"infographic","title":"string","subtitle":"optional","sections":[{"heading":"string","value":"string","description":"string","icon":"chart|users|globe|rocket|shield|zap|heart|star|target|clock"}],"footer":"optional"}
Rules: 3-5 sections.

=== MINDMAP ===
{"action":"new|update","type":"mindmap","title":"string","root":{"label":"string","children":[{"label":"string","children":[{"label":"string"}]}]}}
Rules: Root has 2-4 children, each with 1-3 sub-children.`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })

  const { text, currentChart, existingTypes } = req.body || {}
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text input is required' })
  }

  let userMessage = text.trim()

  if (existingTypes && existingTypes.length > 0) {
    userMessage = `[CHARTS ALREADY GENERATED: ${existingTypes.join(', ')}]\nTry a DIFFERENT chart type if the content allows it.\n\n${userMessage}`
  }

  if (currentChart && currentChart.type) {
    userMessage = `[CURRENT CHART DISPLAYED]\n${JSON.stringify(currentChart)}\n\n[NEW TRANSCRIPT]\n${userMessage}`
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const systemPrompt = attempt === 0
        ? SYSTEM_PROMPT
        : SYSTEM_PROMPT + '\n\nCRITICAL: Your previous response was not valid JSON. Return ONLY valid JSON. No markdown. No code fences.'

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
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

      // Claude decided to skip
      if (chartData && (chartData.skip || chartData.action === 'skip')) {
        return res.status(200).json({ action: 'skip' })
      }

      if (!chartData || !chartData.type) {
        throw new Error('Missing type field in response')
      }

      // Ensure action field exists (default to "new")
      if (!chartData.action) chartData.action = 'new'

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
