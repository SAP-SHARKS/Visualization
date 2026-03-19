/**
 * Server-side Supabase client for Vercel serverless functions.
 * Uses service role key (not the frontend anon key).
 *
 * Required env vars:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (server-side only)
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

let _client = null

function getClient() {
  if (_client) return _client
  if (!url || !key) return null
  _client = createClient(url, key)
  return _client
}

/**
 * Check if server-side Supabase is configured.
 */
export function isServerSupabaseConfigured() {
  return !!(url && key)
}

/**
 * Fetch all active templates from Supabase.
 * @returns {Promise<Array>} Array of template objects
 */
export async function fetchActiveTemplates() {
  const client = getClient()
  if (!client) return []

  const { data, error } = await client
    .from('visual_templates')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('Failed to fetch templates:', error)
    return []
  }

  return data || []
}

/**
 * Record template usage in the database.
 * @param {Array} usages - Array of { template_id, session_id, confidence_score, selection_time_ms }
 */
export async function recordTemplateUsages(usages) {
  const client = getClient()
  if (!client || !usages.length) return

  try {
    await client.from('template_usage').insert(usages)
  } catch (err) {
    console.error('Failed to record template usage:', err)
  }
}

// ── Infographic Configuration ───────────────────────────

/**
 * Fetch all infographic topics from Supabase.
 * @returns {Promise<Array>} Array of { name, keywords }
 */
export async function fetchInfographicTopics() {
  const client = getClient()
  if (!client) return []
  const { data, error } = await client.from('infographic_topics').select('name, keywords')
  if (error) { console.error('Failed to fetch infographic topics:', error); return [] }
  return data || []
}

/**
 * Fetch all infographic palettes from Supabase.
 * @returns {Promise<Array>} Array of { name, bg, accent, secondary, highlight, text_color, card }
 */
export async function fetchInfographicPalettes() {
  const client = getClient()
  if (!client) return []
  const { data, error } = await client.from('infographic_palettes').select('name, bg, accent, secondary, highlight, text_color, card')
  if (error) { console.error('Failed to fetch infographic palettes:', error); return [] }
  return data || []
}

/**
 * Fetch all infographic layouts from Supabase.
 * @returns {Promise<Array>} Array of { name, category, description, content_affinity }
 */
export async function fetchInfographicLayouts() {
  const client = getClient()
  if (!client) return []
  const { data, error } = await client.from('infographic_layouts').select('name, category, description, content_affinity')
  if (error) { console.error('Failed to fetch infographic layouts:', error); return [] }
  return data || []
}
