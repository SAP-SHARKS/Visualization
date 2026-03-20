/**
 * Vercel serverless function — generates 2 Napkin.ai visual variations
 * for a specific canvas visual card.
 * Accepts structured schema_data, converts to text, sends to Napkin API.
 */

const NAPKIN_BASE = 'https://api.napkin.ai'
const DEFAULT_STYLE = 'CDQPRVVJCSTPRBBCD5Q6AWR' // Vibrant Strokes

// ── Convert schema_data to descriptive text for Napkin ──
function formatVisualAsText(slug, schemaData, title, explanation) {
  let text = ''
  if (title) text += `Title: ${title}\n\n`
  if (explanation) text += `Context: ${explanation}\n\n`

  const d = schemaData || {}

  switch (slug) {
    case 'takeaways': {
      text += 'Key Takeaways:\n'
      for (const item of (d.items || [])) {
        text += `- ${typeof item === 'string' ? item : item.text || ''}${item.highlight ? ' (IMPORTANT)' : ''}\n`
      }
      break
    }
    case 'eli5': {
      if (d.simple) text += `Simple explanation: ${d.simple}\n`
      if (d.analogy) text += `Analogy: ${d.analogy}\n`
      break
    }
    case 'blindspots': {
      text += 'Blind Spots & Risks:\n'
      for (const item of (d.items || [])) {
        text += `- ${item.question || ''}: ${item.note || ''}\n`
      }
      break
    }
    case 'flowchart': {
      if (d.mermaid) text += `Process flow:\n${d.mermaid}\n`
      if (d.caption) text += `\n${d.caption}\n`
      break
    }
    case 'mindmap': {
      const root = d.root || { label: d.center || d.title || 'Topic', children: d.branches || [] }
      text += `Mind map: ${root.label}\n`
      text += formatNode(root, 0)
      break
    }
    case 'problemsolution': {
      text += 'Problems:\n'
      for (const p of (d.problems || [])) text += `- ${p}\n`
      text += '\nSolutions:\n'
      for (const s of (d.solutions || [])) text += `- ${s}\n`
      break
    }
    case 'proscons': {
      if (d.topic) text += `Topic: ${d.topic}\n\n`
      text += 'Pros:\n'
      for (const p of (d.pros || [])) text += `+ ${p}\n`
      text += '\nCons:\n'
      for (const c of (d.cons || [])) text += `- ${c}\n`
      break
    }
    case 'comparison': {
      if (d.options) text += `Comparing: ${d.options.join(' vs ')}\n\n`
      for (const c of (d.criteria || [])) {
        text += `${c.name}: ${(c.values || []).join(', ')}\n`
      }
      break
    }
    case 'timeline': {
      text += 'Timeline:\n'
      for (const item of (d.items || d.events || [])) {
        text += `- ${item.time || item.date || ''}: ${item.event || item.text || ''}${item.note ? ` (${item.note})` : ''}\n`
      }
      break
    }
    case 'metrics': {
      text += 'Key Metrics:\n'
      for (const m of (d.items || [])) {
        text += `- ${m.name || m.label || ''}: ${m.value || ''}${m.context ? ` (${m.context})` : ''}\n`
      }
      break
    }
    case 'terms': {
      text += 'Glossary:\n'
      for (const t of (d.items || [])) {
        text += `- ${t.term || ''}: ${t.definition || ''}\n`
      }
      break
    }
    default: {
      // Generic: iterate over keys and build readable text
      text += genericFormat(d)
    }
  }

  return text.trim()
}

function formatNode(node, depth) {
  if (!node) return ''
  let out = ''
  const indent = '  '.repeat(depth)
  if (node.label) out += `${indent}- ${node.label}\n`
  for (const child of (node.children || [])) {
    out += formatNode(child, depth + 1)
  }
  return out
}

function genericFormat(obj, depth = 0) {
  if (!obj || typeof obj !== 'object') return String(obj || '')
  const indent = '  '.repeat(depth)
  let out = ''
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('_')) continue
    if (Array.isArray(val)) {
      out += `${indent}${key}:\n`
      for (const item of val) {
        if (typeof item === 'string') {
          out += `${indent}  - ${item}\n`
        } else if (typeof item === 'object') {
          out += `${indent}  - ${Object.values(item).filter(v => typeof v === 'string' || typeof v === 'number').join(': ')}\n`
        }
      }
    } else if (typeof val === 'object') {
      out += `${indent}${key}:\n${genericFormat(val, depth + 1)}`
    } else {
      out += `${indent}${key}: ${val}\n`
    }
  }
  return out
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.NAPKIN_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'NAPKIN_API_KEY not configured on server' })

  const { slug, schemaData, title, explanation } = req.body || {}
  if (!slug) return res.status(400).json({ error: 'slug is required' })

  const content = formatVisualAsText(slug, schemaData, title, explanation)
  if (!content) return res.status(400).json({ error: 'No content could be generated from the visual data' })

  console.log(`[Napkin] Generating 2 variations for "${slug}" (${content.length} chars)`)

  try {
    // Step 1: Create visual request — 2 variations, English, SVG
    const createRes = await fetch(`${NAPKIN_BASE}/v1/visual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        format: 'svg',
        content: '[IMPORTANT: All text in the visual MUST be in English.]\n\n' + content,
        style_id: DEFAULT_STYLE,
        language: 'en-US',
        number_of_visuals: 2,
        width: 1200,
      }),
    })

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}))
      const msg = errData.message || errData.error || `Napkin API error (${createRes.status})`
      console.error('[Napkin] Create failed:', msg)
      return res.status(502).json({ error: msg })
    }

    const createData = await createRes.json()
    const requestId = createData.id
    if (!requestId) return res.status(502).json({ error: 'No request ID returned from Napkin API' })

    console.log(`[Napkin] Request created: ${requestId}`)

    // Step 2: Poll for completion with exponential backoff
    let delay = 2000
    const maxWait = 45000
    let elapsed = 0
    let statusData = null

    while (elapsed < maxWait) {
      await new Promise(r => setTimeout(r, delay))
      elapsed += delay

      const statusRes = await fetch(`${NAPKIN_BASE}/v1/visual/${requestId}/status`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })

      if (statusRes.status === 410) {
        return res.status(502).json({ error: 'Napkin request expired' })
      }

      if (!statusRes.ok) {
        delay = Math.min(delay * 2, 8000)
        continue
      }

      statusData = await statusRes.json()

      if (statusData.status === 'completed') break
      if (statusData.status === 'failed') {
        console.error('[Napkin] Generation failed')
        return res.status(502).json({ error: 'Napkin visual generation failed' })
      }

      delay = Math.min(delay * 1.5, 6000)
    }

    if (!statusData || statusData.status !== 'completed') {
      return res.status(504).json({ error: 'Napkin visual generation timed out' })
    }

    const files = statusData.generated_files || []
    if (files.length === 0) {
      return res.status(502).json({ error: 'No files generated by Napkin' })
    }

    console.log(`[Napkin] Completed — ${files.length} files generated`)

    // Step 3: Download ALL generated files (2 variations)
    const images = []
    for (const file of files) {
      const fileRes = await fetch(file.url, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })
      if (!fileRes.ok) continue
      const svgBuffer = await fileRes.arrayBuffer()
      const base64 = Buffer.from(svgBuffer).toString('base64')
      images.push(`data:image/svg+xml;base64,${base64}`)
    }

    if (images.length === 0) {
      return res.status(502).json({ error: 'Failed to download generated visuals' })
    }

    return res.status(200).json({ images })
  } catch (err) {
    console.error('[Napkin] Error:', err.message)
    return res.status(500).json({ error: `Failed to generate visual: ${err.message}` })
  }
}
