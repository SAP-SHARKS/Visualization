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
    const startTime = Date.now()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

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

    const elapsedMs = Date.now() - startTime
    data._generationTimeMs = elapsedMs

    return { data }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' }
    }
    return { error: err.message || 'Network error. Check your connection.' }
  }
}

/**
 * Generate chart data from text input using Claude API.
 * @param {string} text - The input text to analyze
 * @param {string} [forcedType] - Optional chart type to force
 * @returns {Promise<{data?: object, error?: string}>}
 */
export async function generateChartClaude(text, forcedType) {
  try {
    const startTime = Date.now()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    const res = await fetch('/api/generate-chart-claude', {
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

    const elapsedMs = Date.now() - startTime
    data._generationTimeMs = elapsedMs

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
    const timeout = setTimeout(() => controller.abort(), 60000)

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
    if (!data || !data.concepts || !data.takeaways) {
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
 * Generate multiple charts from a complete transcript using Claude API.
 * Returns an array of chart objects, each representing a key topic.
 * @param {string} text - The full transcript text
 * @returns {Promise<{charts?: object[], error?: string}>}
 */
export async function generateTranscriptVisuals(text) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120000)

    const res = await fetch('/api/generate-transcript-visuals', {
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
    if (!data || !Array.isArray(data.charts)) {
      return { error: 'Invalid response from API' }
    }

    return { title: data.title || null, subtitle: data.subtitle || null, charts: data.charts }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' }
    }
    return { error: err.message || 'Network error. Check your connection.' }
  }
}

/**
 * Generate a Napkin AI visual from text.
 * @param {string} text - The text to visualize
 * @param {string} [forcedType] - Optional visual type hint (e.g. "flowchart", "timeline")
 * @returns {Promise<{imageUrl?: string, error?: string}>}
 */
export async function generateNapkinVisual(text, forcedType) {
  try {
    const body = { text }
    if (forcedType) body.forcedType = forcedType

    const res = await fetch('/api/generate-chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { error: err.error || `Napkin API error (${res.status})` }
    }
    const data = await res.json()
    return { imageUrl: data.imageUrl || null, error: data.imageUrl ? null : 'No image returned' }
  } catch (err) {
    return { error: err.message || 'Network error' }
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
