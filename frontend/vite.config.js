import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev middleware that handles /api/generate-chart
// In production, Vercel serverless functions handle this route
function apiMiddleware(envVars) {
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use('/api/generate-chart', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' })
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        // Read request body
        let body = ''
        for await (const chunk of req) body += chunk
        let parsed
        try { parsed = JSON.parse(body) } catch { parsed = {} }

        const { text, forcedType } = parsed
        if (!text) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Text is required' }))
          return
        }

        const napkinKey = envVars.NAPKIN_API_KEY
        if (!napkinKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'NAPKIN_API_KEY not set in .env.local' }))
          return
        }

        const NAPKIN_BASE = 'https://api.napkin.ai'
        const DEFAULT_STYLE = 'CDQPRVVJCSTPRBBCD5Q6AWR' // Vibrant Strokes

        try {
          // Build Napkin request
          const napkinBody = {
            format: 'svg',
            content: '[IMPORTANT: All text in the visual MUST be in English.]\n\n' + text.trim(),
            style_id: DEFAULT_STYLE,
            number_of_visuals: 1,
          }
          if (forcedType) napkinBody.visual_query = forcedType

          // Step 1: Create visual request
          const createRes = await fetch(NAPKIN_BASE + '/v1/visual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + napkinKey },
            body: JSON.stringify(napkinBody),
          })

          if (!createRes.ok) {
            const errData = await createRes.json().catch(() => ({}))
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: errData.message || errData.error || ('Napkin API error (' + createRes.status + ')') }))
            return
          }

          const createData = await createRes.json()
          const requestId = createData.id
          if (!requestId) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'No request ID from Napkin' }))
            return
          }

          // Step 2: Poll for completion
          let delay = 2000
          let elapsed = 0
          const maxWait = 45000
          let statusData = null

          while (elapsed < maxWait) {
            await new Promise(r => setTimeout(r, delay))
            elapsed += delay

            const statusRes = await fetch(NAPKIN_BASE + '/v1/visual/' + requestId + '/status', {
              headers: { 'Authorization': 'Bearer ' + napkinKey },
            })

            if (statusRes.status === 410) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Napkin request expired' }))
              return
            }

            if (!statusRes.ok) { delay = Math.min(delay * 2, 8000); continue }

            statusData = await statusRes.json()
            if (statusData.status === 'completed') break
            if (statusData.status === 'failed') {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Napkin generation failed' }))
              return
            }
            delay = Math.min(delay * 2, 8000)
          }

          if (!statusData || statusData.status !== 'completed') {
            res.writeHead(504, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Napkin generation timed out' }))
            return
          }

          const files = statusData.generated_files || []
          if (files.length === 0) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'No files generated' }))
            return
          }

          // Step 3: Download SVG and convert to base64 data URL
          const fileRes = await fetch(files[0].url, {
            headers: { 'Authorization': 'Bearer ' + napkinKey },
          })

          if (!fileRes.ok) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to download visual' }))
            return
          }

          const svgText = await fileRes.text()
          const base64 = Buffer.from(svgText).toString('base64')
          const imageUrl = 'data:image/svg+xml;base64,' + base64

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ type: 'napkin-image', title: 'Generated Visual', imageUrl }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Failed to generate visual: ' + err.message }))
        }
      })

      // /api/generate-chart-claude — evolving chart generation using Claude API
      server.middlewares.use('/api/generate-chart-claude', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' })
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        for await (const chunk of req) body += chunk
        let parsed
        try { parsed = JSON.parse(body) } catch { parsed = {} }

        const { newSentences, allTopicSentences, currentChart, topicSummary, existingTypes } = parsed

        // Support both new format (newSentences) and legacy (text)
        let sentences = newSentences
        let allSentences = allTopicSentences
        if (!sentences && parsed.text) {
          sentences = [parsed.text]
          allSentences = [parsed.text]
        }

        if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'newSentences array is required' }))
          return
        }

        const apiKey = envVars.ANTHROPIC_API_KEY
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in .env.local' }))
          return
        }

        const CHART_SYSTEM = `You are a real-time data visualization engine for live MEETINGS.
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

        // Build structured user message
        let userMessage = ''

        if (existingTypes && existingTypes.length > 0) {
          userMessage += '[CHARTS ALREADY GENERATED: ' + existingTypes.join(', ') + ']\nStrongly prefer a DIFFERENT chart type.\n\n'
        }

        if (currentChart && currentChart.type) {
          userMessage += '[CURRENT CHART]\n' + JSON.stringify(currentChart) + '\n'
          if (topicSummary) {
            userMessage += '[CURRENT TOPIC SUMMARY: ' + topicSummary + ']\n'
          }
          userMessage += '\n'
        } else {
          userMessage += '[NO CHART EXISTS YET — you MUST return action:"new"]\n\n'
        }

        if (allSentences && allSentences.length > 0) {
          userMessage += '[PREVIOUS TRANSCRIPT SENTENCES]\n' + allSentences.join('\n') + '\n\n'
        }

        userMessage += '[NEW SENTENCES TO PROCESS]\n' + sentences.join('\n') + '\n\n'
        userMessage += 'DECISION:\n1. If the content is pure filler → SKIP\n2. If the speaker continues the same explanation → UPDATE\n3. If the discussion clearly shifts topic → NEW'

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const sysPrompt = attempt === 0 ? CHART_SYSTEM : CHART_SYSTEM + '\n\nCRITICAL: Your previous response was not valid JSON. Return ONLY valid JSON. No markdown. No code fences.'

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
                system: sysPrompt,
                messages: [{ role: 'user', content: userMessage }],
              }),
              signal: controller.signal,
            })
            clearTimeout(timeout)

            if (!response.ok) {
              const errData = await response.json().catch(() => ({}))
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: (errData.error && errData.error.message) || ('Claude API error (' + response.status + ')') }))
              return
            }

            const data = await response.json()
            let jsonStr = (data.content && data.content[0] && data.content[0].text || '').trim()
            if (jsonStr.startsWith('```')) {
              jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
            }

            const chartData = JSON.parse(jsonStr)

            if (chartData && (chartData.skip || chartData.action === 'skip')) {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ action: 'skip' }))
              return
            }

            if (!chartData || !chartData.type) throw new Error('Missing type')

            if (!chartData.action) chartData.action = 'new'

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(chartData))
            return
          } catch (err) {
            if (err.name === 'AbortError') {
              res.writeHead(504, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Request timed out' }))
              return
            }
            if (attempt === 0 && (err instanceof SyntaxError || (err.message && err.message.includes('type')))) continue
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to generate chart: ' + err.message }))
            return
          }
        }
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Failed to generate valid chart data after retry' }))
      })

      // /api/generate-sections — extract section data from transcript
      server.middlewares.use('/api/generate-sections', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' })
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        for await (const chunk of req) body += chunk
        let parsed
        try { parsed = JSON.parse(body) } catch { parsed = {} }

        const { text } = parsed
        if (!text) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Text is required' }))
          return
        }

        const apiKey = envVars.ANTHROPIC_API_KEY
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in .env.local' }))
          return
        }

        const SECTIONS_PROMPT = [
          'You are a transcript analyst. Analyze the given call/conversation transcript and extract structured data.',
          '',
          'Return a single JSON object with ALL of these fields:',
          '{"takeaways":[{"icon":"emoji","text":"string"}],',
          '"eli5":{"summary":"string"},',
          '"blindspots":[{"icon":"emoji","title":"string","desc":"string"}],',
          '"concepts":[{"icon":"emoji","term":"string","def":"string","tag":"Mentioned in call | Not mentioned — technical context | Core mechanic"}],',
          '"suggestions":[{"title":"string","desc":"string","badge":"User Experience | Technical | Business Model","cls":"badge-ux | badge-tech | badge-biz"}],',
          '"actionItems":[{"title":"string","desc":"string","priority":"HIGH | MEDIUM | LOW","cls":"priority-high | priority-med | priority-low"}],',
          '"quizData":[{"q":"string","opts":["string","string","string"],"correct":0,"fb":{"correct":"string","wrong":"string"}}],',
          '"suggestedQs":["string","string","string","string"]}',
          '',
          'RULES:',
          '- takeaways: ALWAYS include. 3-6 key takeaways — most important points to remember.',
          '- eli5: ALWAYS include. Explain the entire meeting as if to a 5-year-old. Simple words, fun analogies, no jargon. 3-5 sentences.',
          '- blindspots: ALWAYS include. 2-4 gaps, risks, or blindspots — things NOT addressed but should have been.',
          '- concepts: 4-6 key terms. Mix mentioned and contextual terms.',
          '- suggestions: 3-5 actionable suggestions. Map badge→cls: "User Experience"→"badge-ux", "Technical"→"badge-tech", "Business Model"→"badge-biz".',
          '- actionItems: 3-5 tasks. Map priority→cls: "HIGH"→"priority-high", "MEDIUM"→"priority-med", "LOW"→"priority-low".',
          '- quizData: 3 questions, 3 options each, "correct" is 0-based index.',
          '- suggestedQs: exactly 4 follow-up questions.',
          '',
          'ALL output MUST be in English.',
          'Return ONLY valid JSON. No markdown fences. No explanation.',
        ].join('\n')

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const sysPrompt = attempt === 0 ? SECTIONS_PROMPT : SECTIONS_PROMPT + '\nCRITICAL: Return ONLY valid JSON.'

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
                system: sysPrompt,
                messages: [{ role: 'user', content: text.trim() }],
              }),
              signal: controller.signal,
            })
            clearTimeout(timeout)

            if (!response.ok) {
              const errData = await response.json().catch(() => ({}))
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: (errData.error && errData.error.message) || ('Claude API error (' + response.status + ')') }))
              return
            }

            const data = await response.json()
            let jsonStr = (data.content && data.content[0] && data.content[0].text || '').trim()
            if (jsonStr.startsWith('```')) {
              jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
            }

            const sections = JSON.parse(jsonStr)
            if (!sections || !sections.concepts || !sections.takeaways || !sections.eli5 || !sections.blindspots) throw new Error('Missing fields')

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(sections))
            return
          } catch (err) {
            if (err.name === 'AbortError') {
              res.writeHead(504, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Request timed out' }))
              return
            }
            if (attempt === 0) continue
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: err.message }))
            return
          }
        }
      })

      // /api/ask-question — answer questions about the transcript
      server.middlewares.use('/api/ask-question', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' })
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        for await (const chunk of req) body += chunk
        let parsed
        try { parsed = JSON.parse(body) } catch { parsed = {} }

        const { text, question } = parsed
        if (!text || !question) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Both text and question are required' }))
          return
        }

        const apiKey = envVars.ANTHROPIC_API_KEY
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in .env.local' }))
          return
        }

        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 15000)

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1024,
              system: "You are a transcript analyst. Answer the user's question based ONLY on the provided call transcript. Be concise (2-4 sentences). If the topic wasn't directly discussed, say so and suggest it as a follow-up.",
              messages: [{ role: 'user', content: 'TRANSCRIPT:\n' + text.trim() + '\n\nQUESTION: ' + question.trim() }],
            }),
            signal: controller.signal,
          })
          clearTimeout(timeout)

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: (errData.error && errData.error.message) || ('Claude API error (' + response.status + ')') }))
            return
          }

          const data = await response.json()
          const answer = (data.content && data.content[0] && data.content[0].text) || 'Unable to generate an answer.'

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ answer }))
        } catch (err) {
          if (err.name === 'AbortError') {
            res.writeHead(504, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Request timed out' }))
            return
          }
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })

      // /api/generate-transcript-visuals — analyze complete transcript and generate multiple charts
      server.middlewares.use('/api/generate-transcript-visuals', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' })
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        for await (const chunk of req) body += chunk
        let parsed
        try { parsed = JSON.parse(body) } catch { parsed = {} }

        const { text } = parsed
        if (!text || typeof text !== 'string' || !text.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Transcript text is required' }))
          return
        }

        const apiKey = envVars.ANTHROPIC_API_KEY
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in .env.local' }))
          return
        }

        const VISUALS_SYSTEM = `You are an expert data visualization engine. You receive a COMPLETE transcript and must analyze it to produce multiple meaningful charts that together help a reader fully understand the transcript at a glance.

=== YOUR TASK ===

1. Read the entire transcript carefully
2. Suggest a title
3. One sentence summary of what was discussed and why it matters
4. Identify 1-8 KEY TOPICS or themes discussed (don't create charts for greetings, filler, or meta-conversation)
5. For each topic, create the BEST chart type to visualize it
6. Return a JSON object with title, subtitle, and charts array

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

flowchart → 5-9 nodes
timeline → 4-7 events
mindmap → 4-6 branches
comparison → 3-4 items
sequence → 5-9 steps
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

Return a JSON object with a "title", "subtitle", and a "charts" array:
{"title": "Short descriptive title for the entire transcript (3-8 words)", "subtitle": "One sentence summary of what was discussed and why it matters", "charts": [ ...chart objects... ]}

Return ONLY valid JSON. No markdown. No explanation. No code fences.`

        const userMessage = 'Here is the complete transcript to analyze and visualize:\n\n' + text.trim() + '\n\nAnalyze this transcript. Create exactly ONE chart per distinct topic discussed. If only 1-2 topics exist, return only 1-2 charts. Do NOT create multiple charts for the same topic. Return {"title": "...", "subtitle": "...", "charts": [...]}'

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const sysPrompt = attempt === 0 ? VISUALS_SYSTEM : VISUALS_SYSTEM + '\n\nCRITICAL: Your previous response was not valid JSON. Return ONLY valid JSON. No markdown. No code fences.'

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
                system: sysPrompt,
                messages: [{ role: 'user', content: userMessage }],
              }),
              signal: controller.signal,
            })
            clearTimeout(timeout)

            if (!response.ok) {
              const errData = await response.json().catch(() => ({}))
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: (errData.error && errData.error.message) || ('Claude API error (' + response.status + ')') }))
              return
            }

            const data = await response.json()
            let jsonStr = (data.content && data.content[0] && data.content[0].text || '').trim()
            if (jsonStr.startsWith('```')) {
              jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
            }

            const result = JSON.parse(jsonStr)

            if (!result || !Array.isArray(result.charts) || result.charts.length === 0) {
              throw new Error('Invalid response: expected {charts: [...]}')
            }

            const validCharts = result.charts.filter(c => c && c.type && c.title)
            if (validCharts.length === 0) throw new Error('No valid charts in response')

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ title: result.title || validCharts[0]?.title || 'Untitled', subtitle: result.subtitle || '', charts: validCharts }))
            return
          } catch (err) {
            if (err.name === 'AbortError') {
              res.writeHead(504, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Request timed out' }))
              return
            }
            if (attempt === 0 && (err instanceof SyntaxError || (err.message && (err.message.includes('type') || err.message.includes('charts'))))) continue
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to generate visuals: ' + err.message }))
            return
          }
        }
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Failed to generate valid chart data after retry' }))
      })

      // /api/generate-canvas — delegates to the actual serverless handler
      // so vite dev and vercel deploy use the exact same pipeline
      server.middlewares.use('/api/generate-canvas', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' })
          res.end()
          return
        }

        // Inject env vars so the handler can read process.env
        process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || envVars.ANTHROPIC_API_KEY
        process.env.SUPABASE_URL = process.env.SUPABASE_URL || envVars.SUPABASE_URL
        process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY

        // Read body
        let body = ''
        for await (const chunk of req) body += chunk
        try { req.body = JSON.parse(body) } catch { req.body = {} }

        // Import via Vite's SSR loader (supports HMR, no stale cache)
        try {
          const mod = await server.ssrLoadModule('./api/generate-canvas.js')
          const handler = mod.default
          // Adapt to Express-like res API the handler expects
          const fakeRes = {
            _status: 200,
            _headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            setHeader(k, v) { this._headers[k] = v },
            status(code) { this._status = code; return this },
            json(data) {
              res.writeHead(this._status, this._headers)
              res.end(JSON.stringify(data))
            },
            end() { res.end() },
          }
          await handler(req, fakeRes)
        } catch (err) {
          console.error('[vite-api] generate-canvas error:', err)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Server error: ' + err.message }))
        }
      })

      // /api/generate-infographic-image — Gemini Imagen infographic generation
      server.middlewares.use('/api/generate-infographic-image', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' })
          res.end()
          return
        }

        process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || envVars.GEMINI_API_KEY

        let body = ''
        for await (const chunk of req) body += chunk
        try { req.body = JSON.parse(body) } catch { req.body = {} }

        try {
          const mod = await server.ssrLoadModule('./api/generate-infographic-image.js')
          const handler = mod.default
          const fakeRes = {
            _status: 200,
            _headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            setHeader(k, v) { this._headers[k] = v },
            status(code) { this._status = code; return this },
            json(data) {
              res.writeHead(this._status, this._headers)
              res.end(JSON.stringify(data))
            },
            end() { res.end() },
          }
          await handler(req, fakeRes)
        } catch (err) {
          console.error('[vite-api] generate-infographic-image error:', err)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Server error: ' + err.message }))
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  // loadEnv reads .env, .env.local, .env.[mode] etc.
  // Third arg '' means load ALL env vars (not just VITE_ prefixed)
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), apiMiddleware(env)],
    server: {
      port: 5173,
    },
    envPrefix: ['VITE_', 'ANTHROPIC_', 'NAPKIN_'],
  }
})
