const SYSTEM_PROMPT = `You are a real-time data visualization engine for live MEETINGS.
You create charts ONLY for substantive, chart-worthy content that helps someone understand key discussion points at a glance.

You receive transcript sentences from a live meeting. Your job:

1. decide if the content is worth visualizing
2. if yes, decide UPDATE or NEW
3. generate the chart

=== THREE ACTIONS ===

1. SKIP — return {"action":"skip"}

SKIP ONLY for pure filler with ZERO informational content:

* greetings or introductions ("hi everyone", "thanks for joining")
* small talk
* meeting logistics ("can you hear me", "let me share my screen")
* pure conversational filler ("as I was saying", "good point")

If the sentence contains ANY idea, concept, plan, fact, or explanation, do NOT skip.

2. UPDATE — expand the current chart.

Return:
{"action":"update","topicSummary":"2-6 words", ...fullChartJSON}

Use UPDATE when the speaker continues discussing the SAME topic.

Typical UPDATE situations:

* adding another step in a process
* expanding an existing node
* adding another example
* adding detail to an existing concept
* continuing the same explanation

The chart should grow naturally as the topic is explained.

Do NOT remove previous nodes when updating.

3. NEW — create a fresh chart.

Return:
{"action":"new","topicSummary":"2-6 words", ...fullChartJSON}

Use NEW only when the discussion clearly shifts.

Examples of when NEW is appropriate:

* a different topic is introduced
* the speaker starts explaining a different system
* the discussion moves from process → comparison
* the meeting shifts to planning, risks, costs, or metrics
* explicit transitions appear ("next topic", "moving on")

Minor clarifications or examples should NOT trigger NEW.

=== TOPIC CONTINUITY RULE ===

Meetings usually explain one topic over multiple sentences.

While the speaker continues discussing the same idea,
keep updating the existing chart.

Create a NEW chart only when the explanation changes direction.

=== SUBTOPIC GUIDELINE ===

Not every subtopic needs a new chart.

Create NEW only if the subtopic would be confusing inside the current chart.

Example:

Topic: API authentication workflow

Sentence: "Client sends login request" → NEW chart

Sentence: "Server validates credentials" → UPDATE

Sentence: "JWT token is generated" → UPDATE

Sentence: "Token expires after 15 minutes" → UPDATE

But if the speaker says:

"We should compare OAuth and API keys"

→ NEW comparison chart

=== CHART SIZE GUIDELINES ===

Charts can grow to a reasonable size before creating a new one.

flowchart → up to 10 nodes
timeline → up to 8 events
mindmap → up to 8 branches
sequence → up to 12 interactions
comparison → 3-4 items
infographic → 4-8 metrics

If the chart becomes too crowded, create a NEW continuation chart.

=== CHART TYPE SELECTION (for NEW charts) ===

Choose the best visual format.

Process, workflow, steps, architecture → mermaid_flowchart
Interactions between systems or people → mermaid_sequence
Dates, milestones, roadmap → timeline
Pros/cons or comparisons → comparison
Topic breakdown or brainstorming → mindmap
ONLY when 3+ numbers or percentages appear → infographic

=== ANTI-INFOGRAPHIC RULE ===

If fewer than 3 numbers or percentages appear in the transcript, do NOT use infographic.

=== CHART QUALITY ===

Each chart should be understandable within 5 seconds.

Rules:

* use real terms from the transcript
* avoid generic labels like "Step 1"
* keep the structure clean and readable
* avoid unnecessary complexity

=== TRANSFORMED TRANSCRIPT ===

Every NEW and UPDATE response MUST include "transformedTranscript".

This is a clean, cumulative summary of ALL transcript content covered by this chart.

Rules:

* ALWAYS write in English, regardless of the transcript language
* remove filler words
* merge repeated ideas
* preserve important facts and numbers
* write clearly and professionally

CRITICAL — UPDATE behavior:
When returning an UPDATE, the transformedTranscript must contain ALL information from the CURRENT chart's transformedTranscript PLUS the new sentences.
Do NOT discard or summarize away previous content. APPEND and merge new information into the existing text.
The transformedTranscript should grow as the chart grows — it is the complete written record of everything this chart covers.

=== NAPKIN VISUAL TYPE ===

Every NEW and UPDATE response MUST include "napkinVisualType".
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
{"action":"new|update","topicSummary":"string","type":"mermaid_flowchart","title":"string","mermaidCode":"graph TD\\n  A[Start] --> B{Decision}\\n  B -->|Yes| C[Process]\\n  B -->|No| D[End]","transformedTranscript":"string","napkinVisualType":"flowchart"}

MERMAID SEQUENCE:
{"action":"new|update","topicSummary":"string","type":"mermaid_sequence","title":"string","mermaidCode":"sequenceDiagram\\n  participant A as User\\n  participant B as Server\\n  A->>B: Request\\n  B-->>A: Response","transformedTranscript":"string","napkinVisualType":"sequence diagram"}

TIMELINE:
{"action":"new|update","topicSummary":"string","type":"timeline","title":"string","events":[{"date":"string","title":"string","description":"string","icon":"optional emoji"}],"transformedTranscript":"string","napkinVisualType":"timeline"}

COMPARISON:
{"action":"new|update","topicSummary":"string","type":"comparison","title":"string","items":[{"name":"string","description":"optional","pros":["string"],"cons":["string"],"stats":[{"label":"string","value":"string"}]}],"transformedTranscript":"string","napkinVisualType":"comparison table"}

INFOGRAPHIC:
{"action":"new|update","topicSummary":"string","type":"infographic","title":"string","subtitle":"optional","sections":[{"heading":"string","value":"string","description":"string","icon":"chart|users|globe|rocket|shield|zap|heart|star|target|clock"}],"footer":"optional","transformedTranscript":"string","napkinVisualType":"infographic"}

MINDMAP:
{"action":"new|update","topicSummary":"string","type":"mindmap","title":"string","root":{"label":"string","children":[{"label":"string","children":[{"label":"string"}]}]},"transformedTranscript":"string","napkinVisualType":"mind map"}

Return ONLY valid JSON.
No markdown.
No explanation.

=== DECISION PROCESS ===

1. If the content is pure filler → SKIP
2. If the speaker continues the same explanation → UPDATE
3. If the discussion clearly shifts topic → NEW`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })

  const { newSentences, allTopicSentences, currentChart, topicSummary, existingTypes } = req.body || {}

  // Support both new format (newSentences) and legacy (text)
  let sentences = newSentences
  let allSentences = allTopicSentences
  if (!sentences && req.body?.text) {
    sentences = [req.body.text]
    allSentences = [req.body.text]
  }

  if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
    return res.status(400).json({ error: 'newSentences array is required' })
  }

  // Build structured user message
  let userMessage = ''

  if (existingTypes && existingTypes.length > 0) {
    userMessage += `[CHARTS ALREADY GENERATED: ${existingTypes.join(', ')}]\nStrongly prefer a DIFFERENT chart type.\n\n`
  }

  if (currentChart && currentChart.type) {
    // Send full chart JSON so Claude can preserve all existing information on UPDATE
    userMessage += `[CURRENT CHART]\n${JSON.stringify(currentChart)}\n`
    if (topicSummary) {
      userMessage += `[CURRENT TOPIC SUMMARY: ${topicSummary}]\n`
    }
    userMessage += '\n'
  } else {
    userMessage += `[NO CHART EXISTS YET — you MUST return action:"new"]\n\n`
  }

  // Send previous sentences neutrally — let Claude decide if they're same topic or not
  if (allSentences && allSentences.length > 0) {
    userMessage += `[PREVIOUS TRANSCRIPT SENTENCES]\n${allSentences.join('\n')}\n\n`
  }

  userMessage += `[NEW SENTENCES TO PROCESS]\n${sentences.join('\n')}\n\n`
  userMessage += `DECISION:\n1. If the content is pure filler → SKIP\n2. If the speaker continues the same explanation → UPDATE\n3. If the discussion clearly shifts topic → NEW`

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

      if (chartData && (chartData.skip || chartData.action === 'skip')) {
        return res.status(200).json({ action: 'skip' })
      }

      if (!chartData || !chartData.type) {
        throw new Error('Missing type field in response')
      }

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
