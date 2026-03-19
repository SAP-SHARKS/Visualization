/**
 * Brand settings — color pickers, font selection, save.
 */

import { useState, useEffect } from 'react'
import { getActiveBrand, saveBrandSettings } from '../../services/templateService'

const CSS = `
.bs-title{font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:24px;}
.bs-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:600px;}
.bs-field{display:flex;flex-direction:column;gap:6px;}
.bs-label{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-dim);font-family:'JetBrains Mono',monospace;}
.bs-input{padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px;outline:none;}
.bs-input:focus{border-color:var(--accent);}
.bs-color-row{display:flex;align-items:center;gap:10px;}
.bs-color-input{width:40px;height:40px;border:none;border-radius:8px;cursor:pointer;background:none;padding:0;}
.bs-color-hex{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text-dim);}
.bs-actions{margin-top:24px;display:flex;gap:12px;}
.bs-btn{padding:10px 20px;border-radius:10px;font-size:12px;font-weight:600;font-family:'JetBrains Mono',monospace;letter-spacing:1px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;transition:all .2s;}
.bs-btn:hover{background:var(--accent);color:#06080c;}
.bs-btn:disabled{opacity:.5;cursor:not-allowed;}
.bs-msg{margin-top:12px;font-size:13px;color:var(--accent);}
`

export default function BrandSettings() {
  const [brand, setBrand] = useState({
    primary_color: '#3dd68c',
    accent_color: '#5bf5dc',
    heading_font: 'DM Serif Display',
    body_font: 'DM Sans',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const id = 'bs-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = CSS
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    getActiveBrand().then(({ brand: b }) => {
      if (b) setBrand(b)
    })
  }, [])

  const set = (key, val) => setBrand(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    const { error } = await saveBrandSettings({
      primary_color: brand.primary_color,
      accent_color: brand.accent_color,
      heading_font: brand.heading_font,
      body_font: brand.body_font,
    })
    if (error) setMsg('Error: ' + error)
    else setMsg('Brand settings saved!')
    setSaving(false)
  }

  return (
    <div>
      <div className="bs-title">Brand Settings</div>
      <div className="bs-grid">
        <div className="bs-field">
          <div className="bs-label">Primary Color</div>
          <div className="bs-color-row">
            <input className="bs-color-input" type="color" value={brand.primary_color} onChange={e => set('primary_color', e.target.value)} />
            <span className="bs-color-hex">{brand.primary_color}</span>
          </div>
        </div>
        <div className="bs-field">
          <div className="bs-label">Accent Color</div>
          <div className="bs-color-row">
            <input className="bs-color-input" type="color" value={brand.accent_color} onChange={e => set('accent_color', e.target.value)} />
            <span className="bs-color-hex">{brand.accent_color}</span>
          </div>
        </div>
        <div className="bs-field">
          <div className="bs-label">Heading Font</div>
          <input className="bs-input" value={brand.heading_font} onChange={e => set('heading_font', e.target.value)} />
        </div>
        <div className="bs-field">
          <div className="bs-label">Body Font</div>
          <input className="bs-input" value={brand.body_font} onChange={e => set('body_font', e.target.value)} />
        </div>
      </div>
      <div className="bs-actions">
        <button className="bs-btn" onClick={handleSave} disabled={saving}>{saving ? 'SAVING...' : 'SAVE'}</button>
      </div>
      {msg && <div className="bs-msg">{msg}</div>}
    </div>
  )
}
