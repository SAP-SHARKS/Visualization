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
            content: text.trim(),
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

      // /api/generate-chart-claude — chart generation using Claude API
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

        const { text, currentChart, existingTypes } = parsed
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

        const CHART_SYSTEM = 'You are a real-time data visualization engine. Generate the best chart for the given text.\n\nYOUR DECISIONS:\n\n1. NEW — return {"action":"new", ...fullChartJSON} when:\n   - There is no current chart, OR the topic changed from the current chart\n   - This is the DEFAULT action — always generate a chart\n\n2. UPDATE — return {"action":"update", ...fullChartJSON} when:\n   - A current chart is provided AND the new text adds MORE DETAIL to the SAME topic\n   - Return the COMPLETE updated chart including ALL previous data plus additions\n\n3. SKIP — return {"action":"skip"} ONLY when:\n   - The text is truly just filler with zero informational content (greetings, etc.)\n\nCHART TYPE SELECTION — pick the BEST match, DO NOT default to infographic:\n- Any process, workflow, steps, how-to, sequence, cause-effect, decision tree → FLOWCHART\n- Comparing 2+ things, pros/cons, trade-offs, "X vs Y", options → COMPARISON\n- Dates, years, history, chronological events, evolution over time → TIMELINE\n- Topic breakdown, categories, subtopics, "types of", hierarchy → MINDMAP\n- ONLY use infographic when there are specific numbers, percentages, statistics, or quantitative metrics\n\nANTI-INFOGRAPHIC RULE: If there are NO specific numbers/percentages in the text, do NOT use infographic.\n\nVARIETY RULE: If the user message shows previously generated chart types, STRONGLY prefer a DIFFERENT type. Most topics can be visualized multiple ways — choose the best UNUSED type. Only repeat a type if the content absolutely demands it.\n\nIMPORTANT:\n- ALWAYS generate a chart when the text has any informational content\n- Return ONLY valid JSON. No markdown fences. No explanation.\n- Keep charts focused (3-6 items max)\n\n=== FLOWCHART ===\n{"action":"new|update","type":"flowchart","title":"string","nodes":[{"id":"string","label":"string","description":"optional","nodeType":"start|process|decision|end"}],"edges":[{"from":"id","to":"id","label":"optional","edgeType":"default|yes|no"}]}\nRules: 3-6 nodes. First=start, last=end.\n\n=== TIMELINE ===\n{"action":"new|update","type":"timeline","title":"string","events":[{"date":"string","title":"string","description":"string","icon":"optional emoji"}]}\nRules: 3-6 events in chronological order.\n\n=== COMPARISON ===\n{"action":"new|update","type":"comparison","title":"string","items":[{"name":"string","description":"optional","pros":["string"],"cons":["string"],"stats":[{"label":"string","value":"string or number"}]}]}\nRules: 2-4 items.\n\n=== INFOGRAPHIC ===\n{"action":"new|update","type":"infographic","title":"string","subtitle":"optional","sections":[{"heading":"string","value":"string","description":"string","icon":"chart|users|globe|rocket|shield|zap|heart|star|target|clock"}],"footer":"optional"}\nRules: 3-5 sections.\n\n=== MINDMAP ===\n{"action":"new|update","type":"mindmap","title":"string","root":{"label":"string","children":[{"label":"string","children":[{"label":"string"}]}]}}\nRules: Root has 2-4 children, each with 1-3 sub-children.'

        let userMessage = text.trim()

        if (existingTypes && existingTypes.length > 0) {
          userMessage = '[CHARTS ALREADY GENERATED: ' + existingTypes.join(', ') + ']\nTry a DIFFERENT chart type if the content allows it.\n\n' + userMessage
        }

        if (currentChart && currentChart.type) {
          userMessage = '[CURRENT CHART DISPLAYED]\n' + JSON.stringify(currentChart) + '\n\n[NEW TRANSCRIPT]\n' + userMessage
        }

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

            // Claude decided to skip
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
          '{"concepts":[{"icon":"emoji","term":"string","def":"string","tag":"Mentioned in call | Not mentioned — technical context | Core mechanic"}],',
          '"suggestions":[{"title":"string","desc":"string","badge":"User Experience | Technical | Business Model","cls":"badge-ux | badge-tech | badge-biz"}],',
          '"actionItems":[{"title":"string","desc":"string","priority":"HIGH | MEDIUM | LOW","cls":"priority-high | priority-med | priority-low"}],',
          '"quizData":[{"q":"string","opts":["string","string","string"],"correct":0,"fb":{"correct":"string","wrong":"string"}}],',
          '"suggestedQs":["string","string","string","string"]}',
          '',
          'RULES:',
          '- concepts: 4-6 key terms. Mix mentioned and contextual terms.',
          '- suggestions: 3-5 actionable suggestions. Map badge→cls: "User Experience"→"badge-ux", "Technical"→"badge-tech", "Business Model"→"badge-biz".',
          '- actionItems: 3-5 tasks. Map priority→cls: "HIGH"→"priority-high", "MEDIUM"→"priority-med", "LOW"→"priority-low".',
          '- quizData: 3 questions, 3 options each, "correct" is 0-based index.',
          '- suggestedQs: exactly 4 follow-up questions.',
          '',
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
            if (!sections || !sections.concepts) throw new Error('Missing fields')

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
