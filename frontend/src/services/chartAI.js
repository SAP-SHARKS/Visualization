/**
 * Frontend service that calls the Vercel serverless function
 * to generate chart data via Claude API.
 */

/**
 * Generate chart data from text input.
 * @param {string} text - The input text to analyze
 * @param {string} [forcedType] - Optional chart type to force
 * @returns {Promise<{data?: import('../schemas/chartSchemas').ChartData, error?: string}>}
 */
export async function generateChart(text, forcedType) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const res = await fetch('/api/generate-chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, forcedType }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      return { error: errBody.error || `Server error (${res.status})` }
    }

    const data = await res.json()

    if (!data || !data.type) {
      return { error: 'Invalid chart data received from API' }
    }

    return { data }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' }
    }
    return { error: err.message || 'Network error. Check your connection.' }
  }
}

/**
 * Generate section data (concepts, suggestions, actionItems, quizData, suggestedQs) from transcript.
 * @param {string} text - The full transcript text
 * @returns {Promise<{data?: object, error?: string}>}
 */
export async function generateSections(text) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const res = await fetch('/api/generate-sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      return { error: errBody.error || `Server error (${res.status})` }
    }

    const data = await res.json()
    if (!data || !data.concepts) {
      return { error: 'Invalid section data received from API' }
    }

    return { data }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' }
    }
    return { error: err.message || 'Network error. Check your connection.' }
  }
}

/**
 * Ask a question about the transcript and get an AI-generated answer.
 * @param {string} text - The full transcript text
 * @param {string} question - The user's question
 * @returns {Promise<{answer?: string, error?: string}>}
 */
export async function askAI(text, question) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch('/api/ask-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, question }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      return { error: errBody.error || `Server error (${res.status})` }
    }

    const data = await res.json()
    return { answer: data.answer || 'Unable to generate an answer.' }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' }
    }
    return { error: err.message || 'Network error. Check your connection.' }
  }
}
