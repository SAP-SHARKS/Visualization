/**
 * Admin page for managing infographic topics, color palettes, and layout styles.
 * Data stored in Supabase tables: infographic_topics, infographic_palettes, infographic_layouts.
 */

import { useState, useEffect } from 'react'
import {
  fetchInfographicTopics, createInfographicTopic, deleteInfographicTopic,
  fetchInfographicPalettes, createInfographicPalette, deleteInfographicPalette,
  fetchInfographicLayouts, createInfographicLayout, deleteInfographicLayout,
  seedInfographicDefaults,
} from '../../services/templateService'

const CSS = `
.ig-title{font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:6px;}
.ig-subtitle{font-size:13px;color:var(--text-dim);margin-bottom:20px;}
.ig-tabs{display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:0;}
.ig-tab{padding:8px 16px;font-size:12px;font-weight:600;font-family:'JetBrains Mono',monospace;letter-spacing:.5px;cursor:pointer;border:none;background:none;color:var(--text-dim);border-bottom:2px solid transparent;transition:all .2s;}
.ig-tab:hover{color:var(--text);}
.ig-tab.active{color:var(--accent);border-bottom-color:var(--accent);}
.ig-toolbar{display:flex;gap:8px;margin-bottom:16px;align-items:center;flex-wrap:wrap;}
.ig-btn{padding:7px 14px;border-radius:8px;font-size:11px;font-weight:600;font-family:'JetBrains Mono',monospace;letter-spacing:.5px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;transition:all .2s;}
.ig-btn:hover{background:var(--accent);color:#06080c;}
.ig-btn:disabled{opacity:.5;cursor:not-allowed;}
.ig-btn-danger{border-color:#f87171;color:#f87171;}
.ig-btn-danger:hover{background:#f87171;color:#fff;}
.ig-btn-seed{border-color:#a78bfa;color:#a78bfa;}
.ig-btn-seed:hover{background:#a78bfa;color:#fff;}
.ig-msg{font-size:12px;color:var(--accent);margin-bottom:12px;}
.ig-msg-err{color:#f87171;}
.ig-count{font-size:11px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;margin-left:auto;}
.ig-grid{display:grid;gap:8px;}
.ig-card{display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;transition:border-color .2s;}
.ig-card:hover{border-color:var(--accent-dim,rgba(61,214,140,0.3));}
.ig-card-name{font-size:13px;font-weight:600;color:var(--text);min-width:140px;}
.ig-card-detail{font-size:11px;color:var(--text-dim);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ig-card-del{padding:4px 8px;border-radius:6px;font-size:10px;font-weight:600;border:1px solid rgba(248,113,113,0.3);background:none;color:#f87171;cursor:pointer;transition:all .2s;flex-shrink:0;}
.ig-card-del:hover{background:#f87171;color:#fff;}
.ig-colors{display:flex;gap:3px;flex-shrink:0;}
.ig-swatch{width:20px;height:20px;border-radius:4px;border:1px solid rgba(0,0,0,0.1);}
.ig-badge{padding:2px 6px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;background:var(--surface-2);color:var(--text-dim);flex-shrink:0;}
.ig-form{display:flex;flex-direction:column;gap:10px;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:16px;}
.ig-form-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.ig-input{padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:12px;outline:none;font-family:'DM Sans',sans-serif;}
.ig-input:focus{border-color:var(--accent);}
.ig-input-sm{width:90px;}
.ig-input-md{width:160px;}
.ig-input-lg{flex:1;min-width:200px;}
.ig-input-color{width:36px;height:36px;border:none;border-radius:6px;cursor:pointer;padding:0;background:none;}
.ig-label{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-dim);font-family:'JetBrains Mono',monospace;}
.ig-textarea{padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:12px;outline:none;resize:vertical;min-height:60px;font-family:'DM Sans',sans-serif;}
.ig-textarea:focus{border-color:var(--accent);}
`

const TABS = [
  { key: 'topics', label: 'Topics', icon: '🏷️' },
  { key: 'palettes', label: 'Palettes', icon: '🎨' },
  { key: 'layouts', label: 'Layouts', icon: '📐' },
]

const LAYOUT_CATEGORIES = ['vertical', 'grid', 'flow', 'editorial', 'spatial', 'data', 'other']
const CONTENT_TAGS = ['many-steps', 'few-steps', 'stats-heavy', 'stats-light', 'process-flow', 'hierarchy', 'comparison', 'overview', 'narrative', 'data-dense']

export default function InfographicSettings() {
  const [tab, setTab] = useState('topics')
  const [topics, setTopics] = useState([])
  const [palettes, setPalettes] = useState([])
  const [layouts, setLayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [seeding, setSeeding] = useState(false)

  // ── Form state ──
  const [topicForm, setTopicForm] = useState({ name: '', keywords: '' })
  const [paletteForm, setPaletteForm] = useState({ name: '', bg: '#F0F9FF', accent: '#0EA5E9', secondary: '#6366F1', highlight: '#22D3EE', text_color: '#0C1445', card: '#E0F2FE' })
  const [layoutForm, setLayoutForm] = useState({ name: '', category: 'vertical', description: '', content_affinity: [] })

  useEffect(() => {
    const id = 'ig-settings-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = CSS
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [t, p, l] = await Promise.all([
      fetchInfographicTopics(),
      fetchInfographicPalettes(),
      fetchInfographicLayouts(),
    ])
    if (!t.error) setTopics(t.topics || [])
    if (!p.error) setPalettes(p.palettes || [])
    if (!l.error) setLayouts(l.layouts || [])
    setLoading(false)
  }

  function flash(text, type = '') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  // ── Seed ──
  async function handleSeed() {
    if (!confirm('This will insert all 11 topics, 52 palettes, and 52 layouts. Existing entries with the same name will be updated. Continue?')) return
    setSeeding(true)
    const res = await seedInfographicDefaults()
    if (res.error) flash(res.error, 'err')
    else {
      const errs = res.errors?.length || 0
      flash(`Seeded ${res.topics} topics, ${res.palettes} palettes, ${res.layouts} layouts${errs ? ` (${errs} errors)` : ''}`)
    }
    await loadAll()
    setSeeding(false)
  }

  // ── Add handlers ──
  async function addTopic() {
    if (!topicForm.name.trim()) return flash('Name is required', 'err')
    const keywords = topicForm.keywords.split(',').map(k => k.trim()).filter(Boolean)
    if (keywords.length === 0) return flash('At least one keyword is required', 'err')
    const { error } = await createInfographicTopic({ name: topicForm.name.trim().toLowerCase(), keywords })
    if (error) return flash(error, 'err')
    flash(`Topic "${topicForm.name}" added`)
    setTopicForm({ name: '', keywords: '' })
    setShowForm(false)
    loadAll()
  }

  async function addPalette() {
    if (!paletteForm.name.trim()) return flash('Name is required', 'err')
    const { error } = await createInfographicPalette({ ...paletteForm, name: paletteForm.name.trim().toLowerCase() })
    if (error) return flash(error, 'err')
    flash(`Palette "${paletteForm.name}" added`)
    setPaletteForm({ name: '', bg: '#F0F9FF', accent: '#0EA5E9', secondary: '#6366F1', highlight: '#22D3EE', text_color: '#0C1445', card: '#E0F2FE' })
    setShowForm(false)
    loadAll()
  }

  async function addLayout() {
    if (!layoutForm.name.trim() || !layoutForm.description.trim()) return flash('Name and description are required', 'err')
    const { error } = await createInfographicLayout({ ...layoutForm, name: layoutForm.name.trim().toLowerCase() })
    if (error) return flash(error, 'err')
    flash(`Layout "${layoutForm.name}" added`)
    setLayoutForm({ name: '', category: 'vertical', description: '', content_affinity: [] })
    setShowForm(false)
    loadAll()
  }

  function toggleAffinityTag(tag) {
    setLayoutForm(p => {
      const tags = p.content_affinity || []
      return { ...p, content_affinity: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag] }
    })
  }

  // ── Delete handlers ──
  async function delTopic(id, name) {
    if (!confirm(`Delete topic "${name}"?`)) return
    const { error } = await deleteInfographicTopic(id)
    if (error) return flash(error, 'err')
    flash(`Topic "${name}" deleted`)
    loadAll()
  }

  async function delPalette(id, name) {
    if (!confirm(`Delete palette "${name}"?`)) return
    const { error } = await deleteInfographicPalette(id)
    if (error) return flash(error, 'err')
    flash(`Palette "${name}" deleted`)
    loadAll()
  }

  async function delLayout(id, name) {
    if (!confirm(`Delete layout "${name}"?`)) return
    const { error } = await deleteInfographicLayout(id)
    if (error) return flash(error, 'err')
    flash(`Layout "${name}" deleted`)
    loadAll()
  }

  // ── Render forms ──
  function renderTopicForm() {
    return (
      <div className="ig-form">
        <div className="ig-label">New Topic</div>
        <div className="ig-form-row">
          <input className="ig-input ig-input-md" placeholder="Topic name (e.g. finance)" value={topicForm.name} onChange={e => setTopicForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="ig-form-row">
          <input className="ig-input ig-input-lg" placeholder="Keywords (comma-separated): revenue, profit, bank, ..." value={topicForm.keywords} onChange={e => setTopicForm(p => ({ ...p, keywords: e.target.value }))} />
        </div>
        <div className="ig-form-row">
          <button className="ig-btn" onClick={addTopic}>ADD TOPIC</button>
          <button className="ig-btn ig-btn-danger" onClick={() => setShowForm(false)}>CANCEL</button>
        </div>
      </div>
    )
  }

  function renderPaletteForm() {
    const fields = [
      { key: 'bg', label: 'BG' },
      { key: 'accent', label: 'Accent' },
      { key: 'secondary', label: 'Secondary' },
      { key: 'highlight', label: 'Highlight' },
      { key: 'text_color', label: 'Text' },
      { key: 'card', label: 'Card' },
    ]
    return (
      <div className="ig-form">
        <div className="ig-label">New Palette</div>
        <div className="ig-form-row">
          <input className="ig-input ig-input-md" placeholder="Palette name" value={paletteForm.name} onChange={e => setPaletteForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="ig-form-row">
          {fields.map(f => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span className="ig-label" style={{ fontSize: 9 }}>{f.label}</span>
              <input className="ig-input-color" type="color" value={paletteForm[f.key]} onChange={e => setPaletteForm(p => ({ ...p, [f.key]: e.target.value }))} />
              <input className="ig-input ig-input-sm" value={paletteForm[f.key]} onChange={e => setPaletteForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 10, textAlign: 'center' }} />
            </div>
          ))}
        </div>
        <div className="ig-form-row">
          <button className="ig-btn" onClick={addPalette}>ADD PALETTE</button>
          <button className="ig-btn ig-btn-danger" onClick={() => setShowForm(false)}>CANCEL</button>
        </div>
      </div>
    )
  }

  function renderLayoutForm() {
    return (
      <div className="ig-form">
        <div className="ig-label">New Layout</div>
        <div className="ig-form-row">
          <input className="ig-input ig-input-md" placeholder="Layout name" value={layoutForm.name} onChange={e => setLayoutForm(p => ({ ...p, name: e.target.value }))} />
          <select className="ig-input ig-input-sm" value={layoutForm.category} onChange={e => setLayoutForm(p => ({ ...p, category: e.target.value }))}>
            {LAYOUT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <textarea className="ig-textarea" placeholder="Layout description for Gemini prompt..." value={layoutForm.description} onChange={e => setLayoutForm(p => ({ ...p, description: e.target.value }))} />
        <div>
          <div className="ig-label" style={{ marginBottom: 6 }}>Content Affinity (when to use this layout)</div>
          <div className="ig-form-row">
            {CONTENT_TAGS.map(tag => (
              <button
                key={tag}
                className="ig-btn"
                style={{
                  fontSize: 10, padding: '4px 8px',
                  background: (layoutForm.content_affinity || []).includes(tag) ? 'var(--accent)' : 'transparent',
                  color: (layoutForm.content_affinity || []).includes(tag) ? '#06080c' : 'var(--accent)',
                }}
                onClick={() => toggleAffinityTag(tag)}
              >{tag}</button>
            ))}
          </div>
        </div>
        <div className="ig-form-row">
          <button className="ig-btn" onClick={addLayout}>ADD LAYOUT</button>
          <button className="ig-btn ig-btn-danger" onClick={() => setShowForm(false)}>CANCEL</button>
        </div>
      </div>
    )
  }

  // ── Render lists ──
  function renderTopics() {
    return (
      <div className="ig-grid">
        {topics.map(t => (
          <div className="ig-card" key={t.id}>
            <div className="ig-card-name">{t.name}</div>
            <div className="ig-card-detail">{(t.keywords || []).join(', ')}</div>
            <span className="ig-badge">{(t.keywords || []).length} kw</span>
            <button className="ig-card-del" onClick={() => delTopic(t.id, t.name)}>DEL</button>
          </div>
        ))}
        {topics.length === 0 && !loading && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No topics. Click "Add" or "Seed Defaults" to get started.</div>}
      </div>
    )
  }

  function renderPalettes() {
    return (
      <div className="ig-grid">
        {palettes.map(p => (
          <div className="ig-card" key={p.id}>
            <div className="ig-card-name">{p.name}</div>
            <div className="ig-colors">
              <div className="ig-swatch" style={{ background: p.bg }} title={`bg: ${p.bg}`} />
              <div className="ig-swatch" style={{ background: p.accent }} title={`accent: ${p.accent}`} />
              <div className="ig-swatch" style={{ background: p.secondary }} title={`secondary: ${p.secondary}`} />
              <div className="ig-swatch" style={{ background: p.highlight }} title={`highlight: ${p.highlight}`} />
              <div className="ig-swatch" style={{ background: p.text_color }} title={`text: ${p.text_color}`} />
              <div className="ig-swatch" style={{ background: p.card }} title={`card: ${p.card}`} />
            </div>
            <button className="ig-card-del" onClick={() => delPalette(p.id, p.name)}>DEL</button>
          </div>
        ))}
        {palettes.length === 0 && !loading && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No palettes. Click "Add" or "Seed Defaults" to get started.</div>}
      </div>
    )
  }

  function renderLayouts() {
    return (
      <div className="ig-grid">
        {layouts.map(l => (
          <div className="ig-card" key={l.id} style={{ flexWrap: 'wrap' }}>
            <div className="ig-card-name">{l.name}</div>
            <span className="ig-badge">{l.category}</span>
            <div className="ig-card-detail">{l.description}</div>
            {(l.content_affinity || []).length > 0 && (
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', width: '100%', marginTop: 4 }}>
                {l.content_affinity.map(tag => (
                  <span key={tag} className="ig-badge" style={{ fontSize: 9, background: 'var(--accent-glow, rgba(61,214,140,0.1))', color: 'var(--accent)' }}>{tag}</span>
                ))}
              </div>
            )}
            <button className="ig-card-del" onClick={() => delLayout(l.id, l.name)}>DEL</button>
          </div>
        ))}
        {layouts.length === 0 && !loading && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No layouts. Click "Add" or "Seed Defaults" to get started.</div>}
      </div>
    )
  }

  const counts = { topics: topics.length, palettes: palettes.length, layouts: layouts.length }

  return (
    <div>
      <div className="ig-title">Infographic Settings</div>
      <div className="ig-subtitle">Manage topic keywords, color palettes, and layout styles used for AI infographic generation</div>

      <div className="ig-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`ig-tab${tab === t.key ? ' active' : ''}`} onClick={() => { setTab(t.key); setShowForm(false) }}>
            {t.icon} {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {msg && <div className={`ig-msg${msgType === 'err' ? ' ig-msg-err' : ''}`}>{msg}</div>}

      <div className="ig-toolbar">
        <button className="ig-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'HIDE FORM' : '+ ADD'}
        </button>
        <button className="ig-btn ig-btn-seed" onClick={handleSeed} disabled={seeding}>
          {seeding ? 'SEEDING...' : 'SEED DEFAULTS'}
        </button>
        <button className="ig-btn" onClick={loadAll} disabled={loading}>REFRESH</button>
        <div className="ig-count">{counts.topics} topics · {counts.palettes} palettes · {counts.layouts} layouts</div>
      </div>

      {showForm && tab === 'topics' && renderTopicForm()}
      {showForm && tab === 'palettes' && renderPaletteForm()}
      {showForm && tab === 'layouts' && renderLayoutForm()}

      {loading ? <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 20 }}>Loading...</div> : (
        <>
          {tab === 'topics' && renderTopics()}
          {tab === 'palettes' && renderPalettes()}
          {tab === 'layouts' && renderLayouts()}
        </>
      )}
    </div>
  )
}
