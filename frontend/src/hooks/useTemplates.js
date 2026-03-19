/**
 * React hook for loading and accessing visual templates.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchAllTemplates, invalidateCache } from '../services/templateService'

/**
 * @returns {{ templates: Array, getTemplate: (slug: string) => object|null, loading: boolean, error: string|null, refresh: () => void }}
 */
export default function useTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const slugMap = useRef(new Map())

  const load = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    const { templates: data, error: err } = await fetchAllTemplates(force)
    if (err) {
      setError(err)
    } else {
      setTemplates(data || [])
      const map = new Map()
      for (const t of (data || [])) {
        map.set(t.slug, t)
      }
      slugMap.current = map
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getTemplate = useCallback((slug) => {
    return slugMap.current.get(slug) || null
  }, [])

  const refresh = useCallback(() => {
    invalidateCache()
    load(true)
  }, [load])

  return { templates, getTemplate, loading, error, refresh }
}
