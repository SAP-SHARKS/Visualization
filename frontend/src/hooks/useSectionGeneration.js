import { useState, useEffect, useCallback, useRef } from 'react'
import { generateSections } from '../services/chartAI'

/**
 * Hook that calls Claude API to generate section data (concepts, suggestions,
 * actionItems, quizData, suggestedQs) from transcript text.
 *
 * Calls once on mount. Returns loading/error state and a retry function.
 */
export default function useSectionGeneration(content) {
  const [sections, setSections] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const calledRef = useRef(false)

  const fetchSections = useCallback(async () => {
    if (!content) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data, error: err } = await generateSections(content)

    if (err) {
      setError(err)
    } else {
      setSections(data)
    }
    setLoading(false)
  }, [content])

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true
    fetchSections()
  }, [fetchSections])

  const retry = useCallback(() => {
    calledRef.current = false
    fetchSections()
  }, [fetchSections])

  return { sections, loading, error, retry }
}
