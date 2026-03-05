/**
 * Separate in-memory cache for Claude chart generation results.
 * Keeps Claude results isolated from Napkin results.
 */

const cache = new Map()
const errorCache = new Map()

function djb2Hash(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return String(Math.abs(hash))
}

function makeKey(text, type) {
  return djb2Hash('claude::' + (type || 'auto') + '::' + text)
}

export function getCacheClaude(text, type) {
  const key = makeKey(text, type)
  return cache.get(key) || null
}

export function setCacheClaude(text, type, data) {
  const key = makeKey(text, type)
  cache.set(key, data)
}

export function getErrorCacheClaude(text, type) {
  const key = makeKey(text, type)
  return errorCache.get(key) || null
}

export function setErrorCacheClaude(text, type, error) {
  const key = makeKey(text, type)
  errorCache.set(key, error)
}
