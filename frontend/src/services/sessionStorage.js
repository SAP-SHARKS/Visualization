/**
 * Supabase session storage service.
 *
 * Persists transcripts, Claude charts, Napkin images, and audio files.
 *
 * Database tables (create in Supabase SQL editor):
 *
 * CREATE TABLE sessions (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   title TEXT,
 *   transcript TEXT,
 *   mode TEXT NOT NULL CHECK (mode IN ('live', 'upload', 'canvas', 'live2')),
 *   canvas_data JSONB,
 *   duration INTEGER DEFAULT 0,
 *   word_count INTEGER DEFAULT 0,
 *   audio_file_url TEXT,
 *   audio_file_name TEXT,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * CREATE TABLE charts (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
 *   position INTEGER NOT NULL DEFAULT 0,
 *   chart_type TEXT,
 *   chart_data JSONB,
 *   napkin_image_url TEXT,
 *   topic_summary TEXT,
 *   transcript TEXT,
 *   transformed_transcript TEXT,
 *   chart_image_url TEXT,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * CREATE TABLE sections (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
 *   takeaways JSONB DEFAULT '[]',
 *   eli5 JSONB DEFAULT '{}',
 *   blindspots JSONB DEFAULT '[]',
 *   concepts JSONB DEFAULT '[]',
 *   suggestions JSONB DEFAULT '[]',
 *   action_items JSONB DEFAULT '[]',
 *   quiz_data JSONB DEFAULT '[]',
 *   suggested_qs JSONB DEFAULT '[]',
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * -- Enable RLS (optional, skip if no auth)
 * ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE charts ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
 *
 * -- Allow all operations (no auth)
 * CREATE POLICY "Allow all" ON sessions FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Allow all" ON charts FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Allow all" ON sections FOR ALL USING (true) WITH CHECK (true);
 *
 * -- Storage bucket for audio files (create via Supabase Dashboard > Storage)
 * -- Bucket name: "audio-files", public access enabled
 *
 * -- Infographic configuration tables:
 *
 * CREATE TABLE infographic_topics (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name TEXT NOT NULL UNIQUE,
 *   keywords TEXT[] NOT NULL DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * CREATE TABLE infographic_palettes (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name TEXT NOT NULL UNIQUE,
 *   bg TEXT NOT NULL,
 *   accent TEXT NOT NULL,
 *   secondary TEXT NOT NULL,
 *   highlight TEXT NOT NULL,
 *   text_color TEXT NOT NULL,
 *   card TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * CREATE TABLE infographic_layouts (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name TEXT NOT NULL UNIQUE,
 *   category TEXT NOT NULL DEFAULT 'other',
 *   description TEXT NOT NULL,
 *   content_affinity TEXT[] NOT NULL DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * ALTER TABLE infographic_topics ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE infographic_palettes ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE infographic_layouts ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow all" ON infographic_topics FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Allow all" ON infographic_palettes FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Allow all" ON infographic_layouts FOR ALL USING (true) WITH CHECK (true);
 *
 * -- If upgrading from older schema, run:
 * ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_mode_check;
 * ALTER TABLE sessions ADD CONSTRAINT sessions_mode_check CHECK (mode IN ('live', 'upload', 'canvas', 'live2'));
 * ALTER TABLE sessions ADD COLUMN IF NOT EXISTS canvas_data JSONB;
 */

import { supabase, isSupabaseConfigured } from './supabase'
import { captureAndUploadCharts } from './chartCapture'

// ==================== Save Session ====================

/**
 * Save a complete session (upload mode).
 * Called after chart generation completes on VisualizePage.
 *
 * @param {object} params
 * @param {string} params.title - Session title
 * @param {string} params.transcript - Full transcript text
 * @param {Array} params.chartFeed - Array of { claudeChart, napkinImage, topicSummary, transformedTranscript }
 * @param {object} [params.sections] - { concepts, suggestions, actionItems, quizData, suggestedQs }
 * @param {File} [params.audioFile] - Audio file to upload (if any)
 * @param {string} [params.audioFileName] - Original audio file name
 * @returns {Promise<{sessionId?: string, error?: string}>}
 */
export async function saveUploadSession({ title, subtitle, transcript, chartFeed, sections, audioFile, audioFileName }) {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase not configured' }
  }

  try {
    // 1. Upload audio file if provided
    let audioFileUrl = null
    if (audioFile) {
      const uploadResult = await uploadAudioFile(audioFile, audioFileName)
      if (uploadResult.error) {
        console.error('Audio upload failed:', uploadResult.error)
      } else {
        audioFileUrl = uploadResult.url
      }
    }

    // 2. Create session record
    const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        title: title || 'Untitled Session',
        subtitle: subtitle || null,
        transcript,
        mode: 'upload',
        word_count: wordCount,
        audio_file_url: audioFileUrl,
        audio_file_name: audioFileName || null,
      })
      .select('id')
      .single()

    if (sessionError) throw sessionError

    const sessionId = session.id

    // 3. Save charts
    if (chartFeed && chartFeed.length > 0) {
      const chartRows = chartFeed.map((item, idx) => ({
        session_id: sessionId,
        position: idx,
        chart_type: item.claudeChart?.type || null,
        chart_data: item.claudeChart || null,
        napkin_image_url: item.napkinImage || null,
        topic_summary: item.topicSummary || item.claudeChart?.title || null,
        transcript: item.transformedTranscript || null,
        transformed_transcript: item.transformedTranscript || null,
      }))

      const { error: chartsError } = await supabase
        .from('charts')
        .insert(chartRows)

      if (chartsError) throw chartsError
    }

    // 4. Save sections if available
    if (sections) {
      const { error: sectionsError } = await supabase
        .from('sections')
        .insert({
          session_id: sessionId,
          takeaways: sections.takeaways || [],
          eli5: sections.eli5 || {},
          blindspots: sections.blindspots || [],
          concepts: sections.concepts || [],
          suggestions: sections.suggestions || [],
          action_items: sections.actionItems || [],
          quiz_data: sections.quizData || [],
          suggested_qs: sections.suggestedQs || [],
        })

      if (sectionsError) throw sectionsError
    }

    // 5. Capture chart images + Napkin images and upload (non-blocking)
    if (chartFeed && chartFeed.length > 0) {
      const mappings = chartFeed.map((item, idx) => ({
        id: item.id,
        position: idx,
        napkinImage: item.napkinImage || null,
      }))
      captureAndUploadCharts(sessionId, mappings).catch(err =>
        console.error('Chart image capture failed:', err)
      )
    }

    return { sessionId }
  } catch (err) {
    console.error('Failed to save upload session:', err)
    return { error: err.message || 'Failed to save session' }
  }
}

// ==================== Save Live Session ====================

/**
 * Save a live recording session.
 * Called when recording stops or on error/disconnect.
 *
 * @param {object} params
 * @param {string[]} params.finalLines - All finalized transcript lines
 * @param {Array} params.chartFeed - Array of { claudeChart, napkinImage, topicSentences, transformedTranscript }
 * @param {number} params.duration - Session duration in seconds
 * @param {number} params.wordCount - Total word count
 * @param {File} [params.audioFile] - Audio file if streaming from file
 * @param {string} [params.audioFileName] - Original audio file name
 * @returns {Promise<{sessionId?: string, error?: string}>}
 */
export async function saveLiveSession({ finalLines, chartFeed, duration, wordCount, audioFile, audioFileName }) {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase not configured' }
  }

  // Don't save empty sessions
  if (!finalLines || finalLines.length === 0) {
    return { error: 'No transcript to save' }
  }

  try {
    // 1. Upload audio file if provided
    let audioFileUrl = null
    if (audioFile) {
      const uploadResult = await uploadAudioFile(audioFile, audioFileName)
      if (uploadResult.error) {
        console.error('Audio upload failed:', uploadResult.error)
      } else {
        audioFileUrl = uploadResult.url
      }
    }

    // 2. Create session record
    const transcript = finalLines.join('\n')
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        title: `Live Session - ${new Date().toLocaleString()}`,
        transcript,
        mode: 'live',
        duration: duration || 0,
        word_count: wordCount || 0,
        audio_file_url: audioFileUrl,
        audio_file_name: audioFileName || null,
      })
      .select('id')
      .single()

    if (sessionError) throw sessionError

    const sessionId = session.id

    // 3. Save charts
    if (chartFeed && chartFeed.length > 0) {
      const chartRows = chartFeed.map((item, idx) => ({
        session_id: sessionId,
        position: idx,
        chart_type: item.claudeChart?.type || null,
        chart_data: item.claudeChart || null,
        napkin_image_url: item.napkinImage || null,
        topic_summary: item.claudeChart?.title || null,
        transcript: item.topicSentences ? item.topicSentences.join('\n') : null,
        transformed_transcript: item.transformedTranscript || null,
      }))

      const { error: chartsError } = await supabase
        .from('charts')
        .insert(chartRows)

      if (chartsError) throw chartsError

      // 4. Capture chart images + Napkin images and upload (non-blocking)
      const mappings = chartFeed.map((item, idx) => ({
        id: item.id,
        position: idx,
        napkinImage: item.napkinImage || null,
      }))
      captureAndUploadCharts(sessionId, mappings).catch(err =>
        console.error('Chart image capture failed:', err)
      )
    }

    return { sessionId }
  } catch (err) {
    console.error('Failed to save live session:', err)
    return { error: err.message || 'Failed to save session' }
  }
}

// ==================== Save Canvas Session ====================

/**
 * Save a canvas session (Visualize2 mode).
 * Called after generateCanvas() completes on Visualize2Page.
 *
 * @param {object} params
 * @param {string} params.title - Session title
 * @param {string} [params.subtitle] - Session subtitle
 * @param {string} params.transcript - Full transcript text
 * @param {Array} params.visuals - Array of visual objects
 * @param {Array} params.decisions - Array of decision objects
 * @param {Array} params.actions - Array of action objects
 * @param {string} [params.infographicImage] - Base64 data URL of the infographic image
 * @returns {Promise<{sessionId?: string, error?: string}>}
 */
export async function saveCanvasSession({ title, subtitle, transcript, visuals, decisions, actions, infographicImage }) {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase not configured' }
  }

  try {
    const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0

    // Upload infographic image to storage if provided
    let infographicImageUrl = null
    if (infographicImage) {
      const uploadResult = await uploadInfographicImage(infographicImage)
      if (uploadResult.url) {
        infographicImageUrl = uploadResult.url
      } else {
        console.error('Infographic image upload failed:', uploadResult.error)
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        title: title || 'Untitled Canvas',
        subtitle: subtitle || null,
        transcript,
        mode: 'canvas',
        word_count: wordCount,
        canvas_data: { visuals, decisions, actions, infographic_image_url: infographicImageUrl },
      })
      .select('id')
      .single()

    if (sessionError) throw sessionError
    return { sessionId: session.id }
  } catch (err) {
    console.error('Failed to save canvas session:', err)
    return { error: err.message || 'Failed to save canvas session' }
  }
}

/**
 * Upload a base64 infographic image to Supabase Storage.
 *
 * @param {string} base64DataUrl - Data URL (data:image/png;base64,...)
 * @returns {Promise<{url?: string, error?: string}>}
 */
export async function uploadInfographicImage(base64DataUrl) {
  try {
    // Parse the data URL
    const match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!match) return { error: 'Invalid base64 data URL' }

    const mimeType = match[1]
    const ext = mimeType.split('/')[1] || 'png'
    const base64 = match[2]

    // Convert base64 to Blob
    const byteChars = atob(base64)
    const byteArray = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i)
    }
    const blob = new Blob([byteArray], { type: mimeType })

    const storagePath = `infographics/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('chart-images')
      .upload(storagePath, blob, { contentType: mimeType, upsert: false })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('chart-images')
      .getPublicUrl(storagePath)

    return { url: urlData.publicUrl }
  } catch (err) {
    return { error: err.message || 'Infographic upload failed' }
  }
}

// ==================== Save Live2 Session (real-time canvas) ====================

/**
 * Save a Live2 session (real-time meeting intelligence).
 *
 * @param {object} params
 * @param {string[]} params.txLines - Transcript lines
 * @param {Array} params.charts - Chart objects from canvas
 * @param {object|null} params.summary - Meeting summary object
 * @param {Array} params.decisions - Decision objects
 * @param {Array} params.actions - Action item objects
 * @returns {Promise<{sessionId?: string, error?: string}>}
 */
export async function saveLive2Session({ txLines, charts, summary, decisions, actions }) {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase not configured' }
  }

  if (!txLines || txLines.length === 0) {
    return { error: 'No transcript to save' }
  }

  try {
    const transcript = txLines.map(l => typeof l === 'string' ? l : (l.speaker != null ? `Speaker ${l.speaker}: ${l.text}` : l.text)).join('\n')
    const wordCount = transcript.split(/\s+/).filter(Boolean).length

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        title: `Live Session - ${new Date().toLocaleString()}`,
        transcript,
        mode: 'live2',
        word_count: wordCount,
        canvas_data: { charts, summary, decisions, actions },
      })
      .select('id')
      .single()

    if (sessionError) throw sessionError
    return { sessionId: session.id }
  } catch (err) {
    console.error('Failed to save live2 session:', err)
    return { error: err.message || 'Failed to save session' }
  }
}

// ==================== Audio File Upload ====================

/**
 * Upload an audio file to Supabase Storage.
 *
 * @param {File} file - The audio file
 * @param {string} [fileName] - Original file name
 * @returns {Promise<{url?: string, error?: string}>}
 */
async function uploadAudioFile(file, fileName) {
  try {
    const ext = fileName?.split('.').pop() || 'webm'
    const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(storagePath, file, {
        contentType: file.type || 'audio/webm',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('audio-files')
      .getPublicUrl(storagePath)

    return { url: urlData.publicUrl }
  } catch (err) {
    return { error: err.message || 'Audio upload failed' }
  }
}

// ==================== Update Session (add Napkin images later) ====================

/**
 * Update a chart's Napkin image URL after async generation completes.
 *
 * @param {string} sessionId
 * @param {number} position - Chart position in the feed
 * @param {string} napkinImageUrl
 */
// ==================== List Sessions ====================

/**
 * Fetch all sessions, newest first.
 * @returns {Promise<{sessions?: Array, error?: string}>}
 */
export async function listSessions() {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, title, mode, word_count, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return { sessions: data }
  } catch (err) {
    console.error('Failed to list sessions:', err)
    return { error: err.message || 'Failed to list sessions' }
  }
}

// ==================== Get Session ====================

/**
 * Fetch a full session with charts and sections.
 * @param {string} sessionId
 * @returns {Promise<{session?: object, charts?: Array, sections?: object, error?: string}>}
 */
export async function getSession(sessionId) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  try {
    const [sessionRes, chartsRes, sectionsRes] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase.from('charts').select('*').eq('session_id', sessionId).order('position', { ascending: true }),
      supabase.from('sections').select('*').eq('session_id', sessionId).single(),
    ])
    if (sessionRes.error) throw sessionRes.error
    return {
      session: sessionRes.data,
      charts: chartsRes.data || [],
      sections: sectionsRes.data || null,
    }
  } catch (err) {
    console.error('Failed to get session:', err)
    return { error: err.message || 'Failed to load session' }
  }
}

// ==================== Update Session (add Napkin images later) ====================

export async function updateChartNapkinImage(sessionId, position, napkinImageUrl) {
  if (!isSupabaseConfigured() || !sessionId) return

  try {
    await supabase
      .from('charts')
      .update({ napkin_image_url: napkinImageUrl })
      .eq('session_id', sessionId)
      .eq('position', position)
  } catch (err) {
    console.error('Failed to update napkin image:', err)
  }
}
