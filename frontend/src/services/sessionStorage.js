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
 *   mode TEXT NOT NULL CHECK (mode IN ('live', 'upload')),
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
export async function saveUploadSession({ title, transcript, chartFeed, sections, audioFile, audioFileName }) {
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
