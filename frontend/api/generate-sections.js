const SYSTEM_PROMPT = `You are a meeting intelligence AI for corporate, technical, and product/strategy meetings. Analyze the given call/conversation transcript and extract structured data for visualization sections.

Return a single JSON object with ALL of the following fields:

{
  "takeaways": [
    {
      "icon": "emoji",
      "text": "One key takeaway from the meeting (1-2 sentences)"
    }
  ],
  "eli5": {
    "summary": "Explain the entire meeting/call like the reader is 5 years old. Use simple analogies, everyday language, and short sentences. 3-5 sentences max."
  },
  "blindspots": [
    {
      "icon": "emoji",
      "title": "Short title of the gap or blindspot",
      "desc": "1-2 sentence explanation of what was missed, overlooked, or left unaddressed in the discussion"
    }
  ],
  "concepts": [
    {
      "icon": "emoji (single relevant emoji)",
      "term": "Key term or concept name",
      "def": "Clear 1-2 sentence definition/explanation of this term in context of the transcript",
      "tag": "Mentioned in call | Not mentioned — technical context | Not mentioned — business context | Core mechanic"
    }
  ],
  "suggestions": [
    {
      "title": "Short actionable suggestion title",
      "desc": "Detailed 2-3 sentence explanation of the suggestion and why it matters",
      "badge": "User Experience | Technical | Business Model",
      "cls": "badge-ux | badge-tech | badge-biz"
    }
  ],
  "actionItems": [
    {
      "title": "Short action item title",
      "desc": "Brief description of what needs to be done and why",
      "priority": "HIGH | MEDIUM | LOW",
      "cls": "priority-high | priority-med | priority-low"
    }
  ],
  "quizData": [
    {
      "q": "Question about the transcript content",
      "opts": ["Option A", "Option B", "Option C"],
      "correct": 0,
      "fb": {
        "correct": "Explanation of why this is correct (2 sentences)",
        "wrong": "Explanation of the correct answer for those who got it wrong (2 sentences)"
      }
    }
  ],
  "suggestedQs": [
    "Relevant follow-up question about the transcript?",
    "Another relevant question?",
    "Third question?",
    "Fourth question?"
  ]
}

RULES:
- takeaways: ALWAYS include. Extract 3-6 key takeaways — the most important points someone should remember from this meeting. Each should be a standalone insight.
- eli5: ALWAYS include. Explain the entire meeting as if to a 5-year-old. Use simple words, fun analogies, no jargon. Make it genuinely understandable to a child.
- blindspots: ALWAYS include. Identify 2-4 gaps, risks, or blindspots — things the speakers did NOT address but should have. Think: missing edge cases, unasked questions, unconsidered risks, skipped stakeholders, ignored tradeoffs.
- concepts: Extract 2-6 key terms. Prioritize terms a non-expert would not know. Mix terms explicitly mentioned in the call with additional technical/business context terms that help understand the topic.
- suggestions: Generate 3-5 actionable suggestions based on what was discussed. Map badge to cls: "User Experience"→"badge-ux", "Technical"→"badge-tech", "Business Model"→"badge-biz".
- actionItems: Generate 3-5 follow-up tasks. Map priority to cls: "HIGH"→"priority-high", "MEDIUM"→"priority-med", "LOW"→"priority-low". Mix HIGH, MEDIUM, and LOW priorities.
- quizData: Generate 3 quiz questions testing comprehension. Each has exactly 3 options. "correct" is the 0-based index of the right answer. Feedback should be educational.
- suggestedQs: Generate exactly 4 natural follow-up questions a listener might ask.

ALL output MUST be in English, even if the transcript is in another language.

IMPORTANT: Return ONLY valid JSON. No markdown fences. No explanation. No text before or after the JSON.`

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
    return res.status(400).json({ error: 'Text input is required' })
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const systemPrompt = attempt === 0
        ? SYSTEM_PROMPT
        : SYSTEM_PROMPT + '\n\nCRITICAL: Your previous response was not valid JSON. Return ONLY valid JSON. No markdown. No explanation. No code fences.'

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
          messages: [{ role: 'user', content: text.trim() }],
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

      const sections = JSON.parse(jsonStr)

      if (!sections || !sections.concepts || !sections.takeaways || !sections.eli5 || !sections.blindspots) {
        throw new Error('Missing required fields in response')
      }

      return res.status(200).json(sections)
    } catch (err) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: 'Claude API request timed out' })
      }
      if (attempt === 0 && (err instanceof SyntaxError || err.message?.includes('Missing'))) {
        continue
      }
      return res.status(500).json({
        error: `Failed to generate sections: ${err.message}`,
      })
    }
  }

  return res.status(500).json({ error: 'Failed to generate valid section data after retry' })
}
