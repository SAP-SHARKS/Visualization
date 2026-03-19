/**
 * Centralized CSS injection manager for visual templates.
 * Each template's CSS is injected once and scoped by slug.
 */

const _injected = new Set()

/**
 * Inject CSS for a template (idempotent).
 * @param {string} slug - Template slug used as style element ID
 * @param {string} cssString - The CSS to inject
 */
export function injectTemplateCSS(slug, cssString) {
  if (!cssString || _injected.has(slug)) return

  const id = `tmpl-css-${slug}`
  if (document.getElementById(id)) {
    _injected.add(slug)
    return
  }

  const style = document.createElement('style')
  style.id = id
  style.textContent = cssString
  document.head.appendChild(style)
  _injected.add(slug)
}

/**
 * Remove injected CSS for a template.
 * @param {string} slug
 */
export function removeTemplateCSS(slug) {
  const el = document.getElementById(`tmpl-css-${slug}`)
  if (el) el.remove()
  _injected.delete(slug)
}

/**
 * Remove all template CSS.
 */
export function removeAllTemplateCSS() {
  for (const slug of _injected) {
    const el = document.getElementById(`tmpl-css-${slug}`)
    if (el) el.remove()
  }
  _injected.clear()
}

/**
 * Inject brand CSS variable overrides on :root.
 * @param {object} brand - Brand settings object
 */
export function injectBrandOverrides(brand) {
  if (!brand) return

  const id = 'tmpl-brand-overrides'
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('style')
    el.id = id
    document.head.appendChild(el)
  }

  const vars = []
  if (brand.primary_color) vars.push(`--accent:${brand.primary_color}`)
  if (brand.accent_color) vars.push(`--accent-secondary:${brand.accent_color}`)
  if (brand.heading_font) vars.push(`--font-heading:'${brand.heading_font}',serif`)
  if (brand.body_font) vars.push(`--font-body:'${brand.body_font}',sans-serif`)

  el.textContent = vars.length ? `:root{${vars.join(';')}}` : ''
}
