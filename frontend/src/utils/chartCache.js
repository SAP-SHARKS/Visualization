/**
 * Simple in-memory cache for chart generation results.
 * Keys are hashes of (text + chartType) to avoid duplicate API calls.
 */

const cache = new Map()

function djb2Hash(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  return String(Math.abs(hash))
}

function makeKey(text, type) {
  return djb2Hash((type || 'auto') + '::' + text)
}

export function getCache(text, type) {
  const key = makeKey(text, type)
  return cache.get(key) || null
}

export function setCache(text, type, data) {
  const key = makeKey(text, type)
  cache.set(key, data)
}

export function clearCache() {
  cache.clear()
}
