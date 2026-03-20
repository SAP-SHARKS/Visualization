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
 * Generate a rich meeting canvas from transcript using Claude API.
 * @param {string} text - The full transcript text
 * @returns {Promise<{title?: string, subtitle?: string, visuals?: object[], decisions?: object[], actions?: object[], error?: string}>}
 */
export async function generateCanvas(text) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120000)

    const res = await fetch('/api/generate-canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, useTemplates: true }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      return { error: errBody.error || `Server error (${res.status})` }
    }

    const data = await res.json()
    if (!data || !Array.isArray(data.visuals)) {
      return { error: 'Invalid response from API' }
    }

    return {
      title: data.title || null,
      subtitle: data.subtitle || null,
      visuals: data.visuals,
      infographic_data: data.infographic_data || null,
      _pipeline: data._pipeline || null,
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.', _pipeline: null }
    }
    return { error: err.message || 'Network error. Check your connection.', _pipeline: null }
  }
}

/**
 * Generate 2 Napkin AI visual variations for a specific canvas visual card.
 * @param {string} slug - The template slug or visual type
 * @param {object} schemaData - The visual's schema data
 * @param {string} [title] - Optional title for context
 * @param {string} [explanation] - Optional explanation for context
 * @returns {Promise<{images?: string[], error?: string}>}
 */
export async function generateNapkinVisual(slug, schemaData, title, explanation) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    const res = await fetch('/api/generate-napkin-visual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, schemaData, title, explanation }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { error: err.error || `Napkin API error (${res.status})` }
    }
    const data = await res.json()
    return { images: data.images || [], error: data.images?.length ? null : 'No images returned' }
  } catch (err) {
    if (err.name === 'AbortError') return { error: 'Napkin generation timed out' }
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

/**
 * Generate an infographic image using Gemini Imagen API.
 * @param {{ title?: string, subtitle?: string, steps?: object[], stats?: any[] }} infographicData
 * @returns {Promise<{imageUrl?: string, error?: string}>}
 */
export async function generateInfographicImage(infographicData) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    const res = await fetch('/api/generate-infographic-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ infographicData }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      return { error: errBody.error || `Server error (${res.status})` }
    }

    const data = await res.json()
    return { imageUrl: data.imageUrl || null, error: data.imageUrl ? null : 'No image returned' }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { error: 'Image generation timed out. Please try again.' }
    }
    return { error: err.message || 'Network error. Check your connection.' }
  }
}
