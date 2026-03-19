/**
 * Universal template renderer.
 * Routes to the correct rendering strategy based on template.render_type:
 * - "html": processes {{variable}}/{{#each}}/{{#if}} in html_template
 * - "mermaid": delegates to MermaidRenderer
 * - "d3-mindmap": delegates to MindmapRenderer
 * - "react-component": lazy-loads named component
 */

import { useEffect, Suspense, lazy, useMemo } from 'react'
import { injectTemplateCSS } from '../utils/templateCssManager'

const MermaidRenderer = lazy(() => import('./charts/MermaidRenderer'))
const MindmapRenderer = lazy(() => import('./charts/MindmapRenderer'))
const TimelineRenderer = lazy(() => import('./charts/TimelineRenderer'))

const LOADING_STYLE = { textAlign: 'center', padding: 40, color: 'var(--text-dim)', fontSize: 12 }

// ── Handlebars-lite template processor ───────────────────

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '')
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function resolve(obj, path) {
  if (path === 'this') return obj
  return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj)
}

/**
 * Find the matching {{/each}} for an {{#each}} tag, handling nesting.
 */
function findMatchingEachEnd(str, startIdx) {
  let depth = 1
  let i = startIdx
  while (i < str.length && depth > 0) {
    const openMatch = str.indexOf('{{#each ', i)
    const closeMatch = str.indexOf('{{/each}}', i)
    if (closeMatch === -1) return -1
    if (openMatch !== -1 && openMatch < closeMatch) {
      depth++
      i = openMatch + 8
    } else {
      depth--
      if (depth === 0) return closeMatch
      i = closeMatch + 9
    }
  }
  return -1
}

/**
 * Process all {{#each}}...{{/each}} blocks, supporting nesting.
 */
function processEachBlocks(template, data) {
  let result = ''
  let i = 0
  while (i < template.length) {
    const openIdx = template.indexOf('{{#each ', i)
    if (openIdx === -1) { result += template.slice(i); break }

    result += template.slice(i, openIdx)

    // Extract path
    const pathEnd = template.indexOf('}}', openIdx)
    if (pathEnd === -1) { result += template.slice(openIdx); break }
    const path = template.slice(openIdx + 8, pathEnd).trim()
    const bodyStart = pathEnd + 2

    // Find matching close tag
    const closeIdx = findMatchingEachEnd(template, bodyStart)
    if (closeIdx === -1) { result += template.slice(openIdx); break }
    const body = template.slice(bodyStart, closeIdx)
    i = closeIdx + 9 // skip past {{/each}}

    const arr = resolve(data, path)
    if (!Array.isArray(arr)) continue

    for (let idx = 0; idx < arr.length; idx++) {
      const item = arr[idx]
      let itemResult = body.replace(/\{\{@index\}\}/g, String(idx))

      if (typeof item !== 'object' || item === null) {
        itemResult = itemResult.replace(/\{\{\{this\}\}\}/g, String(item ?? ''))
        itemResult = itemResult.replace(/\{\{this\}\}/g, escapeHtml(item))
        result += itemResult
        continue
      }

      // Recurse for nested {{#each}} blocks scoped to this item
      itemResult = processEachBlocks(itemResult, item)
      itemResult = processConditionals(itemResult, item)
      itemResult = itemResult.replace(/\{\{\{([\w.]+)\}\}\}/g, (_, p) => String(resolve(item, p) ?? ''))
      itemResult = itemResult.replace(/\{\{([\w.]+)\}\}/g, (_, p) => escapeHtml(resolve(item, p)))
      result += itemResult
    }
  }
  return result
}

/**
 * Process a Handlebars-like template string with data.
 * Supports: {{var}}, {{{raw}}}, {{#each arr}}...{{/each}}, {{#if val}}...{{else}}...{{/if}}, {{@index}}
 */
function processTemplate(template, data) {
  if (!template || !data) return ''

  let result = template

  // Process {{#each array}}...{{/each}} with nesting support
  result = processEachBlocks(result, data)

  // Process top-level {{#if}}
  result = processConditionals(result, data)

  // Replace {{{raw}}} (unescaped)
  result = result.replace(/\{\{\{([\w.]+)\}\}\}/g, (_, path) => String(resolve(data, path) ?? ''))

  // Replace {{prop}} (escaped)
  result = result.replace(/\{\{([\w.]+)\}\}/g, (_, path) => escapeHtml(resolve(data, path)))

  return result
}

function processConditionals(template, data) {
  // {{#if val}}...{{else}}...{{/if}}
  return template.replace(
    /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (_, path, ifBlock, elseBlock) => {
      const val = resolve(data, path)
      if (val && val !== '' && val !== false && val !== 0) {
        return ifBlock
      }
      return elseBlock || ''
    }
  )
}

// ── Component Map for react-component render_type ────────

const COMPONENT_MAP = {
  TimelineRenderer: (data) => {
    const events = (data.items || []).map(item => ({
      date: item.time,
      title: item.event,
      description: item.note || '',
      icon: item.done ? '\u2705' : '\ud83d\udfe2',
    }))
    return (
      <Suspense fallback={<div style={LOADING_STYLE}>Loading timeline...</div>}>
        <TimelineRenderer data={{ events }} />
      </Suspense>
    )
  },
}

// ── Main Component ───────────────────────────────────────

export default function TemplateRenderer({ template, schemaData }) {
  if (!template || !schemaData) return null

  // Log template data for debugging
  useEffect(() => {
    if (template.slug === 'cause_effect') {
      console.group('%c[TemplateRenderer] cause_effect', 'color:#ff8a3b;font-weight:bold')
      console.log('Schema data:', JSON.parse(JSON.stringify(schemaData)))
      console.log('CSS (from Supabase):', template.css_template)
      console.log('HTML template:', template.html_template)
      console.groupEnd()
    }
  }, [template.slug, schemaData])

  // Inject CSS for this template
  useEffect(() => {
    if (template.css_template) {
      injectTemplateCSS(template.slug, template.css_template)
    }
  }, [template.slug, template.css_template])

  const renderType = template.render_type || 'html'

  // ── Mermaid ──
  if (renderType === 'mermaid') {
    if (!schemaData.mermaid) return <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>No diagram data.</p>
    return (
      <div className="v2-chart-wrap">
        <Suspense fallback={<div style={LOADING_STYLE}>Loading diagram...</div>}>
          <MermaidRenderer data={{ mermaidCode: schemaData.mermaid }} />
        </Suspense>
        {schemaData.caption && <div className="v2-chart-caption">{schemaData.caption}</div>}
      </div>
    )
  }

  // ── D3 Mindmap ──
  if (renderType === 'd3-mindmap') {
    const root = schemaData.root || {
      label: schemaData.center || 'Topic',
      children: (schemaData.branches || []).map(b => ({
        label: b.label,
        children: (b.children || []).map(c => ({ label: typeof c === 'string' ? c : c.label || '' }))
      }))
    }
    return (
      <div className="v2-mindmap-wrap">
        <Suspense fallback={<div style={LOADING_STYLE}>Loading mindmap...</div>}>
          <MindmapRenderer data={{ root }} />
        </Suspense>
      </div>
    )
  }

  // ── React Component ──
  if (renderType === 'react-component' && template.react_component_name) {
    const renderer = COMPONENT_MAP[template.react_component_name]
    if (renderer) return renderer(schemaData)
    return <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>Unknown component: {template.react_component_name}</p>
  }

  // ── HTML Template ──
  const html = useMemo(() => processTemplate(template.html_template, schemaData), [template.html_template, schemaData])

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
