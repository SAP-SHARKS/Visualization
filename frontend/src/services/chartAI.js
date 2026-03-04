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
