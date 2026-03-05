import { useState, useEffect, useCallback, useRef } from 'react'
import { generateChartClaude } from '../services/chartAI'
import { getCacheClaude, setCacheClaude, getErrorCacheClaude } from '../utils/chartCacheClaude'

/**
 * Same as useMultiChartGeneration but uses Claude API and separate cache.
 */
export default function useMultiChartGenerationClaude(lines, forcedType) {
  const [charts, setCharts] = useState(new Map())
  const [errors, setErrors] = useState(new Map())
  const pollRef = useRef(null)

  useEffect(() => {
    if (!lines || lines.length === 0) return

    function syncFromCache() {
      const nextCharts = new Map()
      const nextErrors = new Map()
      for (let i = 0; i < lines.length; i++) {
        const text = lines[i].speaker + ': ' + lines[i].text
        const hit = getCacheClaude(text, forcedType)
        if (hit) {
          nextCharts.set(i, hit)
        } else {
          const err = getErrorCacheClaude(text, forcedType)
          if (err) nextErrors.set(i, err)
        }
      }

      setCharts(prev => {
        if (prev.size !== nextCharts.size) return nextCharts
        for (const [k, v] of nextCharts) {
          if (prev.get(k) !== v) return nextCharts
        }
        return prev
      })

      setErrors(prev => {
        if (prev.size !== nextErrors.size) return nextErrors
        for (const [k, v] of nextErrors) {
          if (prev.get(k) !== v) return nextErrors
        }
        return prev
      })
    }

    syncFromCache()

    pollRef.current = setInterval(syncFromCache, 500)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [lines, forcedType])

  useEffect(() => {
    if (lines && (charts.size + errors.size) >= lines.length && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [charts.size, errors.size, lines])

  const progress = charts.size

  const retryLine = useCallback((index) => {
    if (!lines || !lines[index]) return
    const text = lines[index].speaker + ': ' + lines[index].text

    setErrors(prev => { const n = new Map(prev); n.delete(index); return n })

    generateChartClaude(text, forcedType).then(({ data, error }) => {
      if (error) {
        setErrors(prev => new Map(prev).set(index, error))
      } else if (data) {
        setCacheClaude(text, forcedType, data)
        setCharts(prev => new Map(prev).set(index, data))
      }
    })
  }, [lines, forcedType])

  const loading = new Set()
  if (lines) {
    for (let i = 0; i < lines.length; i++) {
      if (!charts.has(i) && !errors.has(i)) loading.add(i)
    }
  }

  return { charts, loading, errors, progress, retryLine }
}
