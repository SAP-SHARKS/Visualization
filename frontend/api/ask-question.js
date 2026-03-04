export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })

  const { text, question } = req.body || {}
  if (!text || !question) {
    return res.status(400).json({ error: 'Both text and question are required' })
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
        system: 'You are a transcript analyst. Answer the user\'s question based ONLY on the provided call transcript. Be concise (2-4 sentences). If the topic wasn\'t directly discussed in the transcript, say so clearly and suggest it as a follow-up question for the participants. Do not make up information that is not in the transcript.',
        messages: [{
          role: 'user',
          content: `TRANSCRIPT:\n${text.trim()}\n\nQUESTION: ${question.trim()}`,
        }],
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
    const answer = data.content?.[0]?.text || 'Unable to generate an answer.'

    return res.status(200).json({ answer })
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out' })
    }
    return res.status(500).json({ error: `Failed to answer question: ${err.message}` })
  }
}
