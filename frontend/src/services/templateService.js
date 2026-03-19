/**
 * Template service — CRUD, caching, pre-filtering, usage tracking, and feedback
 * for the visual_templates system in Supabase.
 */

import { supabase, isSupabaseConfigured } from './supabase'

// ── In-memory cache ──────────────────────────────────────
let _cache = null
let _cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function isCacheValid() {
  return _cache && (Date.now() - _cacheTime < CACHE_TTL)
}

// ── Fetch All Templates ──────────────────────────────────

/**
 * Load all active templates from Supabase, with memory cache.
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<{templates?: Array, error?: string}>}
 */
export async function fetchAllTemplates(forceRefresh = false) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }

  if (!forceRefresh && isCacheValid()) {
    return { templates: _cache }
  }

  try {
    const { data, error } = await supabase
      .from('visual_templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    _cache = data || []
    _cacheTime = Date.now()
    return { templates: _cache }
  } catch (err) {
    console.error('Failed to fetch templates:', err)
    return { error: err.message || 'Failed to fetch templates' }
  }
}

// ── Single Template Lookup ───────────────────────────────

/**
 * Get a template by slug (from cache first).
 * @param {string} slug
 * @returns {Promise<{template?: object, error?: string}>}
 */
export async function getTemplateBySlug(slug) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }

  // Try cache first
  if (isCacheValid()) {
    const found = _cache.find(t => t.slug === slug)
    if (found) return { template: found }
  }

  // Refresh cache and try again
  const { templates, error } = await fetchAllTemplates(true)
  if (error) return { error }

  const found = templates.find(t => t.slug === slug)
  return found ? { template: found } : { error: `Template "${slug}" not found` }
}

/**
 * Get a template by ID (from cache first).
 * @param {string} id
 * @returns {Promise<{template?: object, error?: string}>}
 */
export async function getTemplateById(id) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }

  if (isCacheValid()) {
    const found = _cache.find(t => t.id === id)
    if (found) return { template: found }
  }

  const { templates, error } = await fetchAllTemplates(true)
  if (error) return { error }

  const found = templates.find(t => t.id === id)
  return found ? { template: found } : { error: `Template with ID "${id}" not found` }
}

// ── Pre-Filter (keyword matching) ────────────────────────

/**
 * Fast pre-filter: score templates against transcript text.
 * Returns candidates sorted by relevance score (descending).
 *
 * @param {string} transcript - Transcript text to match against
 * @param {string} [meetingType] - Optional meeting type hint
 * @returns {Promise<{candidates?: Array, error?: string}>}
 */
export async function preFilterTemplates(transcript, meetingType) {
  const { templates, error } = await fetchAllTemplates()
  if (error) return { error }

  const lowerText = transcript.toLowerCase()
  const words = new Set(lowerText.split(/\s+/))

  const scored = templates.map(template => {
    let score = 0

    // Score trigger_signals matches
    for (const signal of (template.trigger_signals || [])) {
      const lowerSignal = signal.toLowerCase()
      // Multi-word signals: check as substring
      if (lowerSignal.includes(' ')) {
        if (lowerText.includes(lowerSignal)) score += 3
      } else {
        // Single-word: check word set for speed
        if (words.has(lowerSignal)) score += 2
        // Also check as substring for partial matches
        else if (lowerText.includes(lowerSignal)) score += 1
      }
    }

    // Score meeting_affinity matches
    if (meetingType) {
      const affinities = (template.meeting_affinity || []).map(a => a.toLowerCase())
      if (affinities.includes('all') || affinities.includes(meetingType.toLowerCase())) {
        score += 2
      }
    }

    // Always-category templates get a boost
    if (template.category === 'always') {
      score += 10
    }

    return { ...template, _score: score }
  })

  // Return all with score > 0, sorted descending
  const candidates = scored
    .filter(t => t._score > 0)
    .sort((a, b) => b._score - a._score)

  return { candidates }
}

// ── CRUD Operations ──────────────────────────────────────

/**
 * Create a new template.
 * @param {object} templateData
 * @returns {Promise<{template?: object, error?: string}>}
 */
export async function createTemplate(templateData) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }

  try {
    const { data, error } = await supabase
      .from('visual_templates')
      .insert(templateData)
      .select()
      .single()

    if (error) throw error
    invalidateCache()
    return { template: data }
  } catch (err) {
    console.error('Failed to create template:', err)
    return { error: err.message || 'Failed to create template' }
  }
}

/**
 * Update an existing template.
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<{template?: object, error?: string}>}
 */
export async function updateTemplate(id, updates) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }

  try {
    const { data, error } = await supabase
      .from('visual_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    invalidateCache()
    return { template: data }
  } catch (err) {
    console.error('Failed to update template:', err)
    return { error: err.message || 'Failed to update template' }
  }
}

/**
 * Delete a template (hard delete).
 * @param {string} id
 * @returns {Promise<{error?: string}>}
 */
export async function deleteTemplate(id) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }

  try {
    const { error } = await supabase
      .from('visual_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
    invalidateCache()
    return {}
  } catch (err) {
    console.error('Failed to delete template:', err)
    return { error: err.message || 'Failed to delete template' }
  }
}

// ── Usage Tracking ───────────────────────────────────────

/**
 * Record a template usage event.
 * @param {string} templateId
 * @param {string|null} sessionId
 * @param {object} [metadata]
 * @param {number} [metadata.confidenceScore]
 * @param {number} [metadata.selectionTimeMs]
 */
export async function recordUsage(templateId, sessionId, metadata = {}) {
  if (!isSupabaseConfigured()) return

  try {
    await supabase.from('template_usage').insert({
      template_id: templateId,
      session_id: sessionId || null,
      confidence_score: metadata.confidenceScore || null,
      selection_time_ms: metadata.selectionTimeMs || null,
    })
  } catch (err) {
    console.error('Failed to record template usage:', err)
  }
}

// ── Feedback ─────────────────────────────────────────────

/**
 * Submit feedback (thumbs up/down) for a visual.
 * @param {string} templateId
 * @param {string|null} sessionId
 * @param {number} rating - 1 (thumbs up) or -1 (thumbs down)
 * @param {object} [visualData] - Snapshot of rendered data
 */
export async function submitFeedback(templateId, sessionId, rating, visualData) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }

  try {
    const { error } = await supabase.from('visual_feedback').insert({
      template_id: templateId,
      session_id: sessionId || null,
      rating,
      visual_data: visualData || null,
    })

    if (error) throw error
    return {}
  } catch (err) {
    console.error('Failed to submit feedback:', err)
    return { error: err.message || 'Failed to submit feedback' }
  }
}

// ── Analytics ────────────────────────────────────────────

/**
 * Get usage stats for all templates.
 * @returns {Promise<{stats?: Array, error?: string}>}
 */
export async function getTemplateStats() {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }

  try {
    // Get usage counts
    const { data: usage, error: usageErr } = await supabase
      .from('template_usage')
      .select('template_id')

    if (usageErr) throw usageErr

    // Get feedback
    const { data: feedback, error: fbErr } = await supabase
      .from('visual_feedback')
      .select('template_id, rating')

    if (fbErr) throw fbErr

    // Aggregate
    const statsMap = {}
    for (const u of (usage || [])) {
      if (!statsMap[u.template_id]) statsMap[u.template_id] = { uses: 0, thumbsUp: 0, thumbsDown: 0 }
      statsMap[u.template_id].uses++
    }
    for (const f of (feedback || [])) {
      if (!statsMap[f.template_id]) statsMap[f.template_id] = { uses: 0, thumbsUp: 0, thumbsDown: 0 }
      if (f.rating === 1) statsMap[f.template_id].thumbsUp++
      else if (f.rating === -1) statsMap[f.template_id].thumbsDown++
    }

    const stats = Object.entries(statsMap).map(([templateId, s]) => ({
      templateId,
      ...s,
    }))

    return { stats }
  } catch (err) {
    console.error('Failed to get template stats:', err)
    return { error: err.message || 'Failed to get stats' }
  }
}

// ── Brand Settings ───────────────────────────────────────

/**
 * Get active brand settings.
 * @returns {Promise<{brand?: object, error?: string}>}
 */
export async function getActiveBrand() {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }

  try {
    const { data, error } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
    return { brand: data || null }
  } catch (err) {
    console.error('Failed to get brand settings:', err)
    return { error: err.message || 'Failed to get brand settings' }
  }
}

/**
 * Save brand settings.
 * @param {object} brandData
 * @returns {Promise<{brand?: object, error?: string}>}
 */
export async function saveBrandSettings(brandData) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }

  try {
    // Deactivate all existing
    await supabase.from('brand_settings').update({ is_active: false }).eq('is_active', true)

    // Insert new active brand
    const { data, error } = await supabase
      .from('brand_settings')
      .insert({ ...brandData, is_active: true })
      .select()
      .single()

    if (error) throw error
    return { brand: data }
  } catch (err) {
    console.error('Failed to save brand settings:', err)
    return { error: err.message || 'Failed to save brand settings' }
  }
}

// ── Cache Management ─────────────────────────────────────

export function invalidateCache() {
  _cache = null
  _cacheTime = 0
}

// ══════════════════════════════════════════════════════════
// ── Infographic Configuration (Topics, Palettes, Layouts) ─
// ══════════════════════════════════════════════════════════

// ── Topics ───────────────────────────────────────────────

export async function fetchInfographicTopics() {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  try {
    const { data, error } = await supabase
      .from('infographic_topics')
      .select('*')
      .order('name')
    if (error) throw error
    return { topics: data || [] }
  } catch (err) {
    return { error: err.message }
  }
}

export async function createInfographicTopic(topic) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  try {
    const { data, error } = await supabase
      .from('infographic_topics')
      .insert(topic)
      .select()
      .single()
    if (error) throw error
    return { topic: data }
  } catch (err) {
    return { error: err.message }
  }
}

export async function deleteInfographicTopic(id) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  try {
    const { error } = await supabase.from('infographic_topics').delete().eq('id', id)
    if (error) throw error
    return {}
  } catch (err) {
    return { error: err.message }
  }
}

// ── Palettes ─────────────────────────────────────────────

export async function fetchInfographicPalettes() {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  try {
    const { data, error } = await supabase
      .from('infographic_palettes')
      .select('*')
      .order('name')
    if (error) throw error
    return { palettes: data || [] }
  } catch (err) {
    return { error: err.message }
  }
}

export async function createInfographicPalette(palette) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  try {
    const { data, error } = await supabase
      .from('infographic_palettes')
      .insert(palette)
      .select()
      .single()
    if (error) throw error
    return { palette: data }
  } catch (err) {
    return { error: err.message }
  }
}

export async function deleteInfographicPalette(id) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  try {
    const { error } = await supabase.from('infographic_palettes').delete().eq('id', id)
    if (error) throw error
    return {}
  } catch (err) {
    return { error: err.message }
  }
}

// ── Layouts ──────────────────────────────────────────────

export async function fetchInfographicLayouts() {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  try {
    const { data, error } = await supabase
      .from('infographic_layouts')
      .select('*')
      .order('category')
      .order('name')
    if (error) throw error
    return { layouts: data || [] }
  } catch (err) {
    return { error: err.message }
  }
}

export async function createInfographicLayout(layout) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  try {
    const { data, error } = await supabase
      .from('infographic_layouts')
      .insert(layout)
      .select()
      .single()
    if (error) throw error
    return { layout: data }
  } catch (err) {
    return { error: err.message }
  }
}

export async function deleteInfographicLayout(id) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  try {
    const { error } = await supabase.from('infographic_layouts').delete().eq('id', id)
    if (error) throw error
    return {}
  } catch (err) {
    return { error: err.message }
  }
}

// ── Seed Defaults ────────────────────────────────────────

export async function seedInfographicDefaults() {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  const { SEED_TOPICS, SEED_PALETTES, SEED_LAYOUTS } = await import('../data/seedInfographic')
  const results = { topics: 0, palettes: 0, layouts: 0, errors: [] }

  // Seed topics
  for (const t of SEED_TOPICS) {
    const { error } = await supabase.from('infographic_topics').upsert(t, { onConflict: 'name' })
    if (error) results.errors.push(`Topic "${t.name}": ${error.message}`)
    else results.topics++
  }

  // Seed palettes
  for (const p of SEED_PALETTES) {
    const { error } = await supabase.from('infographic_palettes').upsert(p, { onConflict: 'name' })
    if (error) results.errors.push(`Palette "${p.name}": ${error.message}`)
    else results.palettes++
  }

  // Seed layouts
  for (const l of SEED_LAYOUTS) {
    const { error } = await supabase.from('infographic_layouts').upsert(l, { onConflict: 'name' })
    if (error) results.errors.push(`Layout "${l.name}": ${error.message}`)
    else results.layouts++
  }

  return results
}
