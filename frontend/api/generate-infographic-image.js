/**
 * Vercel serverless function — generates an infographic image using Gemini API.
 * Uses gemini-2.5-flash-image with image generation capability.
 *
 * Three-mechanism variety system:
 *   A) Topic detection (local keyword matching from Supabase)
 *   B) Random color palette (1 of 52+ from Supabase)
 *   C) Random layout style (1 of 52+ from Supabase)
 *
 * Icons/illustrations are AI-driven — Claude suggests contextual icon_hint per step,
 * and Gemini generates scenario illustrations based on the content.
 */

import {
  fetchInfographicTopics,
  fetchInfographicPalettes,
  fetchInfographicLayouts,
  isServerSupabaseConfigured,
} from './lib/supabaseServer.js'

// ── Hardcoded fallbacks (used when Supabase is not configured) ──

const FALLBACK_TOPICS = [
  { name: 'tech', keywords: ['api', 'code', 'server', 'docker', 'cloud', 'software', 'deploy', 'database', 'devops'] },
  { name: 'finance', keywords: ['revenue', 'profit', 'bank', 'payment', 'budget', 'cost', 'roi', 'investment'] },
  { name: 'health', keywords: ['patient', 'medical', 'therapy', 'hospital', 'diagnosis', 'treatment', 'clinical'] },
  { name: 'education', keywords: ['student', 'learn', 'course', 'training', 'curriculum', 'teacher', 'university'] },
  { name: 'product', keywords: ['user', 'ux', 'design', 'wireframe', 'feature', 'roadmap', 'backlog'] },
  { name: 'sales', keywords: ['lead', 'pipeline', 'marketing', 'funnel', 'conversion', 'crm', 'campaign'] },
  { name: 'security', keywords: ['risk', 'compliance', 'breach', 'encryption', 'vulnerability', 'audit', 'firewall'] },
]

const FALLBACK_PALETTES = [
  { name: 'electric-ocean', bg: '#F0F9FF', accent: '#0EA5E9', secondary: '#6366F1', highlight: '#22D3EE', text_color: '#0C1445', card: '#E0F2FE' },
  { name: 'emerald-bank', bg: '#F0FDF4', accent: '#16A34A', secondary: '#CA8A04', highlight: '#4ADE80', text_color: '#052E16', card: '#DCFCE7' },
  { name: 'aurora', bg: '#F8F0FF', accent: '#8B5CF6', secondary: '#06B6D4', highlight: '#F472B6', text_color: '#1A0536', card: '#F3E8FF' },
  { name: 'cherry-blossom', bg: '#FFF0F5', accent: '#DB2777', secondary: '#0EA5E9', highlight: '#F9A8D4', text_color: '#500724', card: '#FCE7F3' },
  { name: 'mango-storm', bg: '#FFFBEB', accent: '#D97706', secondary: '#7C3AED', highlight: '#34D399', text_color: '#451A03', card: '#FEF3C7' },
]

const FALLBACK_LAYOUTS = [
  { name: 'numbered-steps', category: 'vertical', content_affinity: ['many-steps', 'process-flow'], description: 'Vertical numbered cards connected by a dotted path with circular step indicators' },
  { name: 'icon-grid', category: 'grid', content_affinity: ['few-steps', 'stats-heavy', 'overview'], description: '2-column card grid with large icons centered on top, stat callout pills at bottom of each card' },
  { name: 'timeline-flow', category: 'flow', content_affinity: ['many-steps', 'process-flow', 'narrative'], description: 'Zigzag horizontal timeline with circle nodes, curved connector arrows, and alternating content above/below' },
  { name: 'magazine-spread', category: 'editorial', content_affinity: ['stats-heavy', 'overview', 'narrative'], description: 'Editorial layout with large hero title block, pull-quote callouts, and asymmetric two-column body' },
  { name: 'roadmap-path', category: 'spatial', content_affinity: ['many-steps', 'process-flow', 'narrative'], description: 'Winding road with milestone stops, road-sign stats, and destination flag at the end' },
  { name: 'bento-box', category: 'grid', content_affinity: ['few-steps', 'stats-heavy', 'overview'], description: 'Asymmetric bento-style grid: one large hero card top-left, smaller cards filling remaining space' },
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' })

  const { infographicData } = req.body || {}
  if (!infographicData) return res.status(400).json({ error: 'infographicData is required' })

  const { title, subtitle, steps, stats } = infographicData

  // ── Load configuration from Supabase (with fallbacks) ──
  let topics, palettes, layouts

  if (isServerSupabaseConfigured()) {
    ;[topics, palettes, layouts] = await Promise.all([
      fetchInfographicTopics(),
      fetchInfographicPalettes(),
      fetchInfographicLayouts(),
    ])
    // Use fallbacks if Supabase returned empty
    if (!topics.length) topics = FALLBACK_TOPICS
    if (!palettes.length) palettes = FALLBACK_PALETTES
    if (!layouts.length) layouts = FALLBACK_LAYOUTS
  } else {
    topics = FALLBACK_TOPICS
    palettes = FALLBACK_PALETTES
    layouts = FALLBACK_LAYOUTS
  }

  // ── STEP A: Topic detection (local keyword matching) ──
  const allText = [title, subtitle, ...(steps || []).map(s => `${s.heading} ${s.description}`), ...(stats || []).map(s => typeof s === 'string' ? s : `${s.label} ${s.context || ''}`)].join(' ').toLowerCase()

  let detectedTopic = 'general'
  for (const topic of topics) {
    const matches = (topic.keywords || []).filter(kw => allText.includes(kw)).length
    if (matches >= 2) {
      detectedTopic = topic.name
      break
    }
  }

  // ── STEP B: Random color palette selection ──
  const paletteIdx = Math.floor(Math.random() * palettes.length)
  const palette = palettes[paletteIdx]
  const paletteStr = `${palette.accent}, ${palette.secondary}, ${palette.highlight}`

  // ── STEP C: Context-aware layout selection ──
  // Analyze content structure to build context tags
  const stepCount = (steps || []).length
  const statCount = (stats || []).length
  const contextTags = new Set()

  // Step count tags
  if (stepCount >= 5) contextTags.add('many-steps')
  else if (stepCount >= 1) contextTags.add('few-steps')

  // Stat count tags
  if (statCount >= 3) contextTags.add('stats-heavy')
  else contextTags.add('stats-light')
  if (statCount >= 5) contextTags.add('data-dense')

  // Content pattern detection from text
  const processWords = ['step', 'phase', 'stage', 'flow', 'process', 'pipeline', 'workflow', 'sequence', 'procedure']
  const hierarchyWords = ['level', 'layer', 'tier', 'priority', 'hierarchy', 'foundation', 'core', 'pillar']
  const comparisonWords = ['compare', 'versus', 'vs', 'alternative', 'option', 'difference', 'before', 'after', 'pro', 'con']
  const narrativeWords = ['journey', 'story', 'path', 'roadmap', 'timeline', 'milestone', 'progress', 'evolution']

  if (processWords.some(w => allText.includes(w))) contextTags.add('process-flow')
  if (hierarchyWords.some(w => allText.includes(w))) contextTags.add('hierarchy')
  if (comparisonWords.some(w => allText.includes(w))) contextTags.add('comparison')
  if (narrativeWords.some(w => allText.includes(w))) contextTags.add('narrative')
  if (!contextTags.has('process-flow') && !contextTags.has('hierarchy') && !contextTags.has('comparison') && !contextTags.has('narrative')) {
    contextTags.add('overview') // default if no specific pattern detected
  }

  // Score each layout by how many of its content_affinity tags match the context
  const scored = layouts.map(l => {
    const affinity = l.content_affinity || []
    const score = affinity.filter(tag => contextTags.has(tag)).length
    return { ...l, _score: score }
  })

  // Get the max score
  const maxScore = Math.max(...scored.map(l => l._score), 0)

  // Pick randomly from top-scoring layouts (with at least 1 match)
  let candidates = scored.filter(l => l._score === maxScore && l._score > 0)
  if (candidates.length === 0) candidates = scored // fallback to all if no matches

  const layout = candidates[Math.floor(Math.random() * candidates.length)]

  // ── Build prompt ──
  let prompt = `Generate a professional infographic poster image.`
  prompt += ` Use background color ${palette.bg} with accent colors: ${paletteStr}. Card backgrounds: ${palette.card}. Text color: ${palette.text_color}.`
  prompt += ` Topic: ${detectedTopic}.`
  if (title) prompt += ` Title: "${title}".`
  if (subtitle) prompt += ` Subtitle: "${subtitle}".`

  if (steps && steps.length > 0) {
    prompt += ` There are EXACTLY ${steps.length} sections numbered 1 to ${steps.length}. Show ALL ${steps.length} in strict sequential order, each with a contextual scenario illustration and an appropriate icon. Do NOT skip or repeat any number:`
    for (const step of steps) {
      prompt += ` ${step.number}. "${step.heading}" - ${step.description}.`
      if (step.icon_hint) {
        prompt += ` (Icon: ${step.icon_hint}). Draw a small scene illustrating this step using the suggested icon.`
      } else {
        prompt += ` Choose an appropriate icon and draw a small scene illustrating this step.`
      }
    }
  }

  if (stats && stats.length > 0) {
    prompt += ` Highlight these key stats prominently with large bold numbers, contextual mini illustrations, and appropriate icons:`
    for (const stat of stats) {
      const label = typeof stat === 'string' ? stat : `${stat.value || stat.label || ''} ${stat.description || stat.context || ''}`
      prompt += ` ${label.trim()}.`
    }
  }

  prompt += `

LAYOUT STYLE: ${layout.name} (${layout.category})
${layout.description}

COLOR SCHEME:
- Background: ${palette.bg}
- Accent: ${palette.accent}
- Secondary: ${palette.secondary}
- Highlight: ${palette.highlight}
- Text: ${palette.text_color}
- Card: ${palette.card}

ILLUSTRATION & ICON RULES:
- For EACH step/section, generate a contextual icon that represents the concept (e.g. a gear for processes, a shield for security, a rocket for launches)
- Draw a small scenario illustration (not just an icon) showing the concept in action
- Example: "User Authentication" → person tapping phone with lock screen; "Data Processing" → gears processing documents; "Payment" → hand tapping card on terminal
- Illustrations should be simple flat vector style, 2-3 colors from the palette, fitting the section theme
- Use contextual icons as supporting visual elements throughout

DESIGN RULES:
- Use the exact color scheme specified above — NOT dark mode
- Typography: Bold sans-serif headings with clear visual hierarchy
- Each section should have STANDARD consistent size — equal spacing and uniform section heights
- Vertical portrait layout (1080x1920 standard social media size)
- Visually balanced, easy to read, suitable for social media sharing
- The viewer should understand the whole context within one minute
- No watermarks, no stock photo backgrounds
- Keep text concise and scannable
- Small decorative sparkles or accent dots for visual interest`

  const t0 = Date.now()
  console.log('[Gemini Image] Starting image generation...')
  console.log('[Gemini Image] Input:', { title, subtitle, stepsCount: steps?.length || 0, statsCount: stats?.length || 0 })
  console.log('[Gemini Image] Config:', { topic: detectedTopic, palette: palette.name, layout: layout.name, contextTags: [...contextTags], layoutScore: layout._score, candidates: candidates.length, totalLayouts: layouts.length })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    const model = 'gemini-2.5-flash-image'
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeout)
    const elapsed = Date.now() - t0

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      const errMsg = errData.error?.message || `Gemini API error (${response.status})`
      console.error(`[Gemini Image] API error after ${elapsed}ms:`, errMsg)
      return res.status(502).json({ error: errMsg })
    }

    const data = await response.json()

    // Extract image from response parts
    const parts = data.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'))

    if (!imagePart?.inlineData?.data) {
      console.error(`[Gemini Image] No image in response after ${elapsed}ms`)
      console.log('[Gemini Image] Response parts:', parts.map(p => p.text ? 'text' : p.inlineData?.mimeType || 'unknown'))
      return res.status(502).json({ error: 'No image returned from Gemini' })
    }

    const mimeType = imagePart.inlineData.mimeType
    const base64Data = imagePart.inlineData.data
    const imageUrl = `data:${mimeType};base64,${base64Data}`

    console.log(`[Gemini Image] Success! Image generated in ${elapsed}ms (${mimeType}, ~${Math.round(base64Data.length / 1024)}KB base64)`)

    return res.status(200).json({
      imageUrl,
      prompt,
      meta: { topic: detectedTopic, palette: palette.name, layout: layout.name },
    })
  } catch (err) {
    const elapsed = Date.now() - t0
    if (err.name === 'AbortError') {
      console.error(`[Gemini Image] Request timed out after ${elapsed}ms`)
      return res.status(504).json({ error: 'Gemini API request timed out' })
    }
    console.error(`[Gemini Image] Error after ${elapsed}ms:`, err.message || err)
    return res.status(500).json({ error: err.message || 'Failed to generate infographic image' })
  }
}
