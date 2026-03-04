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
