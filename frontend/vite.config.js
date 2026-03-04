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

        // Load API key from env (passed via loadEnv)
        const apiKey = envVars.ANTHROPIC_API_KEY
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in .env.local' }))
          return
        }

        const SYSTEM_PROMPT = [
          'You are a data visualization expert. Analyze the given text and produce a structured JSON object for rendering a chart.',
          '',
          'CHART TYPE SELECTION RULES:',
          '- Steps, processes, workflows, "how to", sequences, cause-and-effect → flowchart',
          '- Dates, years, historical events, chronological progression, evolution → timeline',
          '- "X vs Y", pros/cons, trade-offs, comparing 2+ options/products/ideas → comparison',
          '- Statistics, key metrics, facts, data points about a single topic → infographic',
          '- Hierarchical ideas, topic breakdown, categories with subtopics, brainstorming → mindmap',
          '',
          'If multiple types fit, prefer: flowchart > comparison > timeline > infographic > mindmap',
          '',
          'IMPORTANT: Return ONLY valid JSON. No markdown fences. No explanation. No text before or after the JSON.',
          '',
          'JSON schemas:',
          'FLOWCHART: {"type":"flowchart","title":"string","nodes":[{"id":"string","label":"string","description":"string","nodeType":"start|process|decision|end"}],"edges":[{"from":"id","to":"id","label":"string","edgeType":"default|yes|no"}]}',
          'TIMELINE: {"type":"timeline","title":"string","events":[{"date":"string","title":"string","description":"string","icon":"emoji"}]}',
          'COMPARISON: {"type":"comparison","title":"string","items":[{"name":"string","description":"string","pros":["string"],"cons":["string"],"stats":[{"label":"string","value":"string|number"}]}]}',
          'INFOGRAPHIC: {"type":"infographic","title":"string","subtitle":"string","sections":[{"heading":"string","value":"string","description":"string","icon":"chart|users|globe|rocket|shield|zap|heart|star|target|clock"}],"footer":"string"}',
          'MINDMAP: {"type":"mindmap","title":"string","root":{"label":"string","children":[{"label":"string","children":[{"label":"string"}]}]}}',
        ].join('\n')

        let userMessage = text.trim()
        if (forcedType) {
          userMessage = '[FORCED CHART TYPE: ' + forcedType + '] Generate ONLY a "' + forcedType + '" type chart.\n\n' + userMessage
        }

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const sysPrompt = attempt === 0 ? SYSTEM_PROMPT : SYSTEM_PROMPT + '\nCRITICAL: Return ONLY valid JSON.'

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
                max_tokens: 4096,
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
            if (!chartData || !chartData.type) throw new Error('Missing type')

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(chartData))
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
            const timeout = setTimeout(() => controller.abort(), 25000)

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
    envPrefix: ['VITE_', 'ANTHROPIC_'],
  }
})
