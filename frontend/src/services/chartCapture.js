/**
 * Chart image capture + Supabase upload utility.
 *
 * Captures rendered chart DOM elements as PNG images and uploads
 * them to Supabase Storage. Uses the same toPng pattern as ChartExportButton.
 */

import { toPng } from 'html-to-image'
import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Capture a DOM element as a PNG blob.
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @returns {Promise<Blob>} PNG blob
 */
async function captureElementAsBlob(element) {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  const dataUrl = await toPng(element, {
    backgroundColor: isLight ? '#F7F8F0' : '#06080c',
    pixelRatio: 2,
    style: { padding: '24px' },
  })

  const res = await fetch(dataUrl)
  return res.blob()
}

/**
 * Upload a blob to Supabase Storage.
 *
 * @param {Blob} blob - Image blob
 * @param {string} sessionId - Session UUID
 * @param {string} fileName - File name (e.g. "0.png" or "0-napkin.svg")
 * @param {string} contentType - MIME type
 * @returns {Promise<string|null>} Public URL or null on failure
 */
async function uploadImageBlob(blob, sessionId, fileName, contentType = 'image/png') {
  const path = `${sessionId}/${fileName}`

  const { error } = await supabase.storage
    .from('chart-images')
    .upload(path, blob, {
      contentType,
      upsert: true,
    })

  if (error) {
    console.error(`[ChartCapture] Upload failed for ${fileName}:`, error.message)
    return null
  }

  const { data } = supabase.storage
    .from('chart-images')
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * Convert a base64 data URL to a Blob.
 *
 * @param {string} dataUrl - base64 data URL (e.g. "data:image/svg+xml;base64,...")
 * @returns {Blob}
 */
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

/**
 * Wait for a DOM element to appear, with retries.
 *
 * @param {string} selector - CSS selector
 * @param {number} maxRetries - Max number of retries
 * @param {number} interval - Ms between retries
 * @returns {Promise<HTMLElement|null>}
 */
async function waitForElement(selector, maxRetries = 10, interval = 500) {
  for (let i = 0; i < maxRetries; i++) {
    const el = document.querySelector(selector)
    if (el && el.querySelector('svg, canvas, .mermaid-chart, img, .chart-container, [class*="chart"], [class*="renderer"]')) {
      return el
    }
    if (el && el.offsetHeight > 50) {
      return el
    }
    await new Promise(r => setTimeout(r, interval))
  }
  return document.querySelector(selector)
}

/**
 * Capture all rendered charts on the page and upload to Supabase.
 *
 * Captures Claude chart DOM elements as PNG + uploads Napkin SVG images.
 * Updates the charts table with both image URLs.
 *
 * @param {string} sessionId - Session UUID from the saved session
 * @param {Array<{id: number, position: number, napkinImage?: string}>} chartMappings
 * @returns {Promise<void>}
 */
export async function captureAndUploadCharts(sessionId, chartMappings) {
  if (!isSupabaseConfigured() || !sessionId) return

  console.log(`[ChartCapture] Starting capture for session ${sessionId}, ${chartMappings.length} charts`)

  // Wait for Suspense/lazy components to finish rendering
  await new Promise(r => setTimeout(r, 2000))

  for (const { id, position, napkinImage } of chartMappings) {
    try {
      // 1. Capture Claude chart from DOM
      const selector = `[data-chart-id="${id}"]`
      const element = await waitForElement(selector)

      let chartImageUrl = null
      if (element) {
        console.log(`[ChartCapture] Capturing Claude chart ${id} (position ${position})`)
        const blob = await captureElementAsBlob(element)
        chartImageUrl = await uploadImageBlob(blob, sessionId, `${position}.png`, 'image/png')
      } else {
        console.warn(`[ChartCapture] Element not found: ${selector}`)
      }

      // 2. Upload Napkin image from base64 data URL
      let napkinStorageUrl = null
      if (napkinImage && napkinImage.startsWith('data:')) {
        console.log(`[ChartCapture] Uploading Napkin image for chart ${id} (position ${position})`)
        const napkinBlob = dataUrlToBlob(napkinImage)
        const ext = napkinImage.includes('svg') ? 'svg' : 'png'
        const contentType = napkinImage.includes('svg') ? 'image/svg+xml' : 'image/png'
        napkinStorageUrl = await uploadImageBlob(napkinBlob, sessionId, `${position}-napkin.${ext}`, contentType)
      }

      // 3. Update DB with both URLs
      const updates = {}
      if (chartImageUrl) updates.chart_image_url = chartImageUrl
      if (napkinStorageUrl) updates.napkin_image_url = napkinStorageUrl

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('charts')
          .update(updates)
          .eq('session_id', sessionId)
          .eq('position', position)
        console.log(`[ChartCapture] Saved images for chart ${id}:`, Object.keys(updates).join(', '))
      }
    } catch (err) {
      console.error(`[ChartCapture] Failed to capture chart ${id}:`, err.message)
    }
  }

  console.log(`[ChartCapture] Done`)
}
