import { useEffect, useRef, useState } from 'react'
import { generateChart } from '../services/chartAI'
import { getCache, setCache } from '../utils/chartCache'

const ALL_TYPES = ['flowchart', 'infographic', 'mindmap', 'timeline', 'comparison']

/**
 * Background hook that pre-generates charts for ALL chart types for every dialogue line.
 * Runs sequentially to avoid API overload. Populates the shared cache so that
 * useMultiChartGeneration finds cached results instantly when the user switches tabs.
 *
 * @param {Array<{speaker: string, text: string}>} lines
 * @returns {{ totalDone: number, totalNeeded: number }}
 */
export default function useBackgroundPregen(lines) {
  const abortRef = useRef(null)
  const [totalDone, setTotalDone] = useState(0)
  const [totalNeeded, setTotalNeeded] = useState(0)

  useEffect(() => {
    if (!lines || lines.length === 0) return

    // Abort previous run
    if (abortRef.current) abortRef.current.aborted = true
    const thisRun = { aborted: false }
    abortRef.current = thisRun

    // Build the full work queue: all (line, type) combos not yet cached
    const queue = []
    for (const type of ALL_TYPES) {
      for (let i = 0; i < lines.length; i++) {
        const text = lines[i].speaker + ': ' + lines[i].text
        if (!getCache(text, type)) {
          queue.push({ index: i, type, text })
        }
      }
    }

    const total = ALL_TYPES.length * lines.length
    setTotalNeeded(total)
    setTotalDone(total - queue.length)

    if (queue.length === 0) return

    async function run() {
      for (const item of queue) {
        if (thisRun.aborted) return

        // Re-check cache (another hook might have populated it)
        if (getCache(item.text, item.type)) {
          setTotalDone(prev => prev + 1)
          continue
        }

        const { data } = await generateChart(item.text, item.type)

        if (thisRun.aborted) return

        if (data) {
          setCache(item.text, item.type, data)
        }

        setTotalDone(prev => prev + 1)

        // Small delay between API calls to avoid rate limits
        if (!thisRun.aborted) {
          await new Promise(r => setTimeout(r, 150))
        }
      }
    }

    run()

    return () => { thisRun.aborted = true }
  }, [lines])

  return { totalDone, totalNeeded }
}
