import { useEffect, useRef, useState } from 'react'
import { generateChartClaude } from '../services/chartAI'
import { getCacheClaude, setCacheClaude, setErrorCacheClaude } from '../utils/chartCacheClaude'

const ALL_TYPES = ['flowchart', 'infographic', 'mindmap', 'timeline', 'comparison']
const CONCURRENCY = 5

/**
 * Background hook that pre-generates charts using Claude API for all chart types.
 * Generates multiple chart types in parallel (up to CONCURRENCY at a time).
 */
export default function useBackgroundPregenClaude(lines) {
  const abortRef = useRef(null)
  const [totalDone, setTotalDone] = useState(0)
  const [totalNeeded, setTotalNeeded] = useState(0)

  useEffect(() => {
    if (!lines || lines.length === 0) return

    if (abortRef.current) abortRef.current.aborted = true
    const thisRun = { aborted: false }
    abortRef.current = thisRun

    const queue = []
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i].speaker + ': ' + lines[i].text
      for (const type of ALL_TYPES) {
        if (!getCacheClaude(text, type)) {
          queue.push({ index: i, type, text })
        }
      }
    }

    const total = ALL_TYPES.length * lines.length
    setTotalNeeded(total)
    setTotalDone(total - queue.length)

    if (queue.length === 0) return

    async function run() {
      let cursor = 0

      async function worker() {
        while (cursor < queue.length) {
          if (thisRun.aborted) return
          const idx = cursor++
          if (idx >= queue.length) return
          const item = queue[idx]

          if (getCacheClaude(item.text, item.type)) {
            setTotalDone(prev => prev + 1)
            continue
          }

          const { data, error } = await generateChartClaude(item.text, item.type)

          if (thisRun.aborted) return

          if (data) {
            setCacheClaude(item.text, item.type, data)
          } else if (error) {
            setErrorCacheClaude(item.text, item.type, error)
          }

          setTotalDone(prev => prev + 1)
        }
      }

      const workers = Array.from({ length: CONCURRENCY }, () => worker())
      await Promise.all(workers)
    }

    run()

    return () => { thisRun.aborted = true }
  }, [lines])

  return { totalDone, totalNeeded }
}
