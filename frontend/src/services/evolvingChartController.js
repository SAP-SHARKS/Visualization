/**
 * Evolving Chart Controller
 *
 * Intelligent batching + orchestration service that replaces the old
 * timer-based sliding-window approach. Produces ONE evolving chart
 * per topic instead of many throwaway charts.
 */

// ==================== Tuning Knobs ====================
const MIN_API_INTERVAL_MS = 6000   // Minimum seconds between Claude API calls
const DEBOUNCE_FIRST_MS = 3000     // Debounce for the very first chart (appear quickly)
const DEBOUNCE_MS = 5000           // Debounce after last sentence before batching
const MAX_WAIT_MS = 12000          // Maximum wait before forcing a call (prevents infinite debounce)
const MIN_SENTENCES_TO_TRIGGER = 1 // Minimum new sentences to trigger a call
const MAX_TOPIC_SENTENCES = 60     // Cap to avoid token overflow

// ==================== Filler Detection ====================
const FILLER_PATTERNS = [
  /^(um+|uh+|ah+|er+|hmm+|huh|oh|okay|ok|yeah|yep|yup|nope|nah|right|sure|so+|well|like|you know|i mean|basically|actually|literally|anyway|anyways|alright)[\.\!\?]?$/i,
  /^(hello|hi|hey|good morning|good afternoon|good evening|goodbye|bye|thanks|thank you|please)[\.\!\?]?$/i,
  /^(can you hear me|is this working|testing|one two three|check check|hello hello)[\.\!\?]?$/i,
  /^[\.\!\?\,\;\:\-]+$/, // pure punctuation
]

function isFiller(sentence) {
  const trimmed = sentence.trim()
  if (!trimmed || trimmed.split(/\s+/).length <= 1) return true
  return FILLER_PATTERNS.some(p => p.test(trimmed))
}

// ==================== Controller ====================
export function createEvolvingChartController({ onChartUpdate, onChartNew, onChartSkip, onError, onGeneratingChange }) {
  // State
  let pendingBuffer = []          // sentences waiting to be sent
  let allTopicSentences = []      // ALL sentences for current topic
  let currentChart = null         // the chart currently displayed
  let topicSummary = null         // topic summary from Claude's last response
  let isGenerating = false        // whether an API call is in flight
  let lastApiCallTime = 0         // timestamp of last API call completion
  let debounceTimer = null        // debounce timer
  let isFirstChart = true         // whether we're generating the very first chart
  let existingTypes = []          // chart types already generated in this session
  let abortController = null      // for aborting in-flight requests
  let destroyed = false           // whether the controller has been destroyed
  let firstPendingTime = 0        // timestamp when first sentence entered pending buffer
  let maxWaitTimer = null          // timer for max-wait cap
  let isFlushing = false           // whether flush() was called (bypass rate limit, retry after in-flight)

  function addSentence(sentence) {
    if (destroyed) return
    if (isFiller(sentence)) return // never reaches the API

    // Track when first sentence entered pending buffer
    if (pendingBuffer.length === 0) {
      firstPendingTime = Date.now()
    }

    pendingBuffer.push(sentence)
    allTopicSentences.push(sentence)

    // Cap topic sentences
    if (allTopicSentences.length > MAX_TOPIC_SENTENCES) {
      allTopicSentences = allTopicSentences.slice(-MAX_TOPIC_SENTENCES)
    }

    scheduleApiCall()
  }

  function scheduleApiCall() {
    if (destroyed || isGenerating) return

    // Clear existing debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    const delay = isFirstChart ? DEBOUNCE_FIRST_MS : DEBOUNCE_MS
    debounceTimer = setTimeout(() => attemptApiCall(), delay)

    // Also set a max-wait timer so continuous speech doesn't stall forever
    if (!maxWaitTimer && pendingBuffer.length > 0) {
      const maxDelay = isFirstChart ? DEBOUNCE_FIRST_MS : MAX_WAIT_MS
      maxWaitTimer = setTimeout(() => {
        maxWaitTimer = null
        if (debounceTimer) {
          clearTimeout(debounceTimer)
          debounceTimer = null
        }
        attemptApiCall()
      }, maxDelay)
    }
  }

  async function attemptApiCall() {
    if (destroyed || isGenerating) return
    if (pendingBuffer.length < MIN_SENTENCES_TO_TRIGGER) return

    // Rate limit check (skip when flushing — session is ending, must process now)
    const elapsed = Date.now() - lastApiCallTime
    if (elapsed < MIN_API_INTERVAL_MS && !isFirstChart && !isFlushing) {
      // Schedule for when we can next call
      const wait = MIN_API_INTERVAL_MS - elapsed
      debounceTimer = setTimeout(() => attemptApiCall(), wait)
      return
    }

    // Clear max-wait timer since we're firing now
    if (maxWaitTimer) {
      clearTimeout(maxWaitTimer)
      maxWaitTimer = null
    }

    // Grab the pending sentences
    const newSentences = [...pendingBuffer]
    pendingBuffer = []
    firstPendingTime = 0

    isGenerating = true
    onGeneratingChange?.(true)

    // Abort any previous in-flight request
    if (abortController) abortController.abort()
    abortController = new AbortController()

    try {
      const body = {
        newSentences,
        allTopicSentences: allTopicSentences.slice(-MAX_TOPIC_SENTENCES),
        currentChart: currentChart || null,
        topicSummary: topicSummary || null,
        existingTypes: existingTypes.length > 0 ? existingTypes : null,
      }

      const res = await fetch('/api/generate-chart-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `API error (${res.status})`)
      }

      const data = await res.json()

      if (destroyed) return

      const action = data.action || 'new'

      if (action === 'skip') {
        onChartSkip?.()
      } else if (action === 'update') {
        // Same topic, enriched chart — replace in-place
        const chartData = { ...data }
        delete chartData.action
        topicSummary = chartData.topicSummary || topicSummary
        delete chartData.topicSummary
        const transformedTranscript = chartData.transformedTranscript || null
        delete chartData.transformedTranscript
        currentChart = chartData
        onChartUpdate?.(chartData, [...allTopicSentences], transformedTranscript)
      } else {
        // New topic
        const chartData = { ...data }
        delete chartData.action
        topicSummary = chartData.topicSummary || null
        delete chartData.topicSummary
        const transformedTranscript = chartData.transformedTranscript || null
        delete chartData.transformedTranscript

        // Archive current chart type
        if (currentChart) {
          existingTypes.push(currentChart.type)
        }

        // Reset topic tracking for new topic
        allTopicSentences = [...newSentences]
        currentChart = chartData
        isFirstChart = false

        onChartNew?.(chartData, [...allTopicSentences], transformedTranscript)
      }

      if (isFirstChart) isFirstChart = false
    } catch (err) {
      if (err.name === 'AbortError') return

      // Put sentences back in buffer so they're not lost
      pendingBuffer = [...newSentences, ...pendingBuffer]

      onError?.(err.message || 'Chart generation failed')
    } finally {
      isGenerating = false
      lastApiCallTime = Date.now()
      onGeneratingChange?.(false)

      // If there are pending sentences that accumulated during the call, process them
      if (pendingBuffer.length > 0 && !destroyed) {
        if (isFlushing) {
          // Flush mode: fire immediately, no debounce/rate-limit
          attemptApiCall()
        } else {
          scheduleApiCall()
        }
      } else {
        isFlushing = false
      }
    }
  }

  function flush() {
    if (destroyed) return

    // Clear any pending timers
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null }
    if (maxWaitTimer) { clearTimeout(maxWaitTimer); maxWaitTimer = null }

    if (pendingBuffer.length > 0) {
      isFlushing = true
      if (!isGenerating) {
        // No in-flight request — fire immediately
        attemptApiCall()
      }
      // If isGenerating is true, the finally block will see isFlushing and
      // re-fire attemptApiCall immediately after the current call completes
    }
  }

  function reset() {
    pendingBuffer = []
    allTopicSentences = []
    currentChart = null
    topicSummary = null
    isFirstChart = true
    existingTypes = []
    lastApiCallTime = 0
    firstPendingTime = 0
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (maxWaitTimer) {
      clearTimeout(maxWaitTimer)
      maxWaitTimer = null
    }
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    isGenerating = false
    isFlushing = false
    onGeneratingChange?.(false)
  }

  function destroy() {
    destroyed = true
    reset()
  }

  function getCurrentChart() {
    return currentChart
  }

  function getExistingTypes() {
    return [...existingTypes]
  }

  return {
    addSentence,
    flush,
    reset,
    destroy,
    getCurrentChart,
    getExistingTypes,
  }
}
