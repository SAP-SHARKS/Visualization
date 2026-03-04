import { useState, useEffect, useCallback, useRef } from 'react'
import { generateChart } from '../services/chartAI'
import { getCache, setCache } from '../utils/chartCache'

/**
 * Hook that reads cached charts for a given forced type and polls for new results.
 * The background pregen hook handles all API calls. This hook just surfaces
 * cached data so the UI updates as charts complete.
 *
 * @param {Array<{speaker: string, text: string}>} lines
 * @param {string|null} forcedType - Chart type for ALL lines
 */
export default function useMultiChartGeneration(lines, forcedType) {
  const [charts, setCharts] = useState(new Map())
  const [errors, setErrors] = useState(new Map())
  const pollRef = useRef(null)

  // Poll cache every 500ms to pick up results from background pregen
  useEffect(() => {
    if (!lines || lines.length === 0) return

    function syncFromCache() {
      let changed = false
      const next = new Map()
      for (let i = 0; i < lines.length; i++) {
        const text = lines[i].speaker + ': ' + lines[i].text
        const hit = getCache(text, forcedType)
        if (hit) {
          next.set(i, hit)
        }
      }

      setCharts(prev => {
        if (prev.size !== next.size) return next
        // Check if any values changed
        for (const [k, v] of next) {
          if (prev.get(k) !== v) return next
        }
        return prev
      })
    }

    // Sync immediately on mount/tab switch
    syncFromCache()
    setErrors(new Map())

    // Poll for new cache entries from background hook
    pollRef.current = setInterval(syncFromCache, 500)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [lines, forcedType])

  // Stop polling once all lines are cached
  useEffect(() => {
    if (lines && charts.size === lines.length && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [charts.size, lines])

  const progress = charts.size

  const retryLine = useCallback((index) => {
    if (!lines || !lines[index]) return
    const text = lines[index].speaker + ': ' + lines[index].text

    setErrors(prev => { const n = new Map(prev); n.delete(index); return n })

    generateChart(text, forcedType).then(({ data, error }) => {
      if (error) {
        setErrors(prev => new Map(prev).set(index, error))
      } else if (data) {
        setCache(text, forcedType, data)
        setCharts(prev => new Map(prev).set(index, data))
      }
    })
  }, [lines, forcedType])

  // Derive loading: lines not yet in cache and not errored
  const loading = new Set()
  if (lines) {
    for (let i = 0; i < lines.length; i++) {
      if (!charts.has(i) && !errors.has(i)) {
        loading.add(i)
      }
    }
  }

  return { charts, loading, errors, progress, retryLine }
}
