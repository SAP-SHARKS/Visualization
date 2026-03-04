import { useState, useEffect, useCallback, useRef } from 'react'
import { generateChart } from '../services/chartAI'
import { getCache, setCache } from '../utils/chartCache'

/**
 * Hook that manages chart generation lifecycle:
 * loading state, caching, error handling, and type forcing.
 *
 * @param {string} text - The input text to generate a chart from
 * @returns {{ chartData: import('../schemas/chartSchemas').ChartData|null, loading: boolean, error: string|null, retry: () => void, forcedType: string|null, setForcedType: (type: string|null) => void }}
 */
export default function useChartGeneration(text) {
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [forcedType, setForcedType] = useState(null)
  const abortRef = useRef(null)

  const generate = useCallback(async (txt, type) => {
    if (!txt || !txt.trim()) return

    // Check cache first
    const cached = getCache(txt, type)
    if (cached) {
      setChartData(cached)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: err } = await generateChart(txt, type)

    if (err) {
      setError(err)
      setLoading(false)
      return
    }

    if (data) {
      setCache(txt, type, data)
      setChartData(data)
    }

    setLoading(false)
  }, [])

  // Generate on text change or type change
  useEffect(() => {
    if (text) {
      generate(text, forcedType)
    }
  }, [text, forcedType, generate])

  const retry = useCallback(() => {
    if (text) {
      generate(text, forcedType)
    }
  }, [text, forcedType, generate])

  return { chartData, loading, error, retry, forcedType, setForcedType }
}
