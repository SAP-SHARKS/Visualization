// Keyword-based early chart type detection
// Runs locally before Claude API to reduce latency

const INDICATORS = {
  flowchart: [
    'first', 'next', 'then', 'process', 'steps', 'workflow',
    'step by step', 'procedure', 'sequence', 'begin', 'start with',
    'followed by', 'after that', 'finally', 'how to', 'instructions',
    'pipeline', 'stage', 'phase',
  ],
  timeline: [
    'year', 'years', 'date', 'earlier', 'later', 'before', 'after',
    'century', 'decade', 'history', 'founded', 'established', 'launched',
    'in 19', 'in 20', 'ago', 'recently', 'evolution', 'era', 'period',
  ],
  comparison: [
    'vs', 'versus', 'compared to', 'pros', 'cons', 'difference',
    'better', 'worse', 'advantage', 'disadvantage', 'unlike',
    'on the other hand', 'whereas', 'while', 'alternative',
    'trade-off', 'tradeoff',
  ],
  infographic: [
    'percent', 'percentage', 'million', 'billion', 'statistics',
    'data shows', 'metric', 'growth', 'revenue', 'rate', 'number of',
    'increased', 'decreased', 'ratio', 'average', 'total',
  ],
  mindmap: [
    'categories', 'types of', 'aspects', 'branches', 'subcategories',
    'divided into', 'consists of', 'includes', 'classified', 'topics',
    'areas', 'domains', 'parts of', 'components',
  ],
}

const CONFIDENCE_THRESHOLD = 2 // need at least 2 keyword matches

/**
 * Detect chart type from text using keyword matching.
 * Returns { type, confidence } or null if no strong match.
 */
export function detectChartType(text) {
  if (!text) return null
  const lower = text.toLowerCase()

  let bestType = null
  let bestScore = 0

  for (const [type, keywords] of Object.entries(INDICATORS)) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestType = type
    }
  }

  if (bestScore >= CONFIDENCE_THRESHOLD) {
    return { type: bestType, confidence: bestScore }
  }

  return null
}
