/**
 * Template management grid — list, filter, toggle active, delete.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllTemplates, deleteTemplate, updateTemplate } from '../../services/templateService'
import { insertSeedTemplates } from '../../data/seedTemplates'

const CSS = `
.tl-head{display:flex;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap;}
.tl-title{font-family:'DM Serif Display',serif;font-size:24px;flex:1;}
.tl-btn{padding:8px 16px;border-radius:10px;font-size:12px;font-weight:600;font-family:'JetBrains Mono',monospace;letter-spacing:1px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;transition:all .2s;}
.tl-btn:hover{background:var(--accent);color:#06080c;}
.tl-btn.seed{border-color:#ff9f43;color:#ff9f43;}
.tl-btn.seed:hover{background:#ff9f43;color:#06080c;}
.tl-filter{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap;}
.tl-chip{padding:5px 12px;border-radius:8px;font-size:11px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif;}
.tl-chip:hover{border-color:var(--accent);}
.tl-chip.active{background:var(--accent);color:#06080c;border-color:var(--accent);font-weight:600;}
.tl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;}
.tl-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;transition:all .3s;cursor:pointer;position:relative;}
.tl-card:hover{border-color:rgba(61,214,140,0.2);transform:translateY(-2px);}
.tl-card-name{font-size:16px;font-weight:600;margin-bottom:4px;}
.tl-card-slug{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-dim);margin-bottom:8px;}
.tl-card-cat{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:6px;letter-spacing:0.8px;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.tl-card-cat.always{background:rgba(61,214,140,0.12);color:#3dd68c;}
.tl-card-cat.structural{background:rgba(0,212,255,0.12);color:#00d4ff;}
.tl-card-cat.analytical{background:rgba(255,159,67,0.12);color:#ff9f43;}
.tl-card-cat.data{background:rgba(139,92,246,0.12);color:#8b5cf6;}
.tl-card-cat.reference{background:rgba(244,114,182,0.12);color:#f472b6;}
.tl-card-render{font-size:10px;color:var(--text-dim);margin-top:6px;font-family:'JetBrains Mono',monospace;}
.tl-card-actions{display:flex;gap:6px;margin-top:12px;}
.tl-card-btn{padding:4px 10px;border-radius:6px;font-size:10px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;transition:all .2s;font-family:'JetBrains Mono',monospace;}
.tl-card-btn:hover{border-color:var(--accent);color:var(--accent);}
.tl-card-btn.danger:hover{border-color:#ff5050;color:#ff5050;}
.tl-card-active{position:absolute;top:12px;right:12px;width:8px;height:8px;border-radius:50%;}
.tl-empty{text-align:center;padding:60px 20px;color:var(--text-dim);}
[data-theme="light"] .tl-card{background:#fff;}
`

const CATEGORIES = ['all', 'always', 'structural', 'analytical', 'data', 'reference']

export default function TemplateList() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    const id = 'tl-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = CSS
      document.head.appendChild(style)
    }
  }, [])

  const load = async () => {
    setLoading(true)
    const { templates: data } = await fetchAllTemplates(true)
    setTemplates(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSeed = async () => {
    setSeeding(true)
    const result = await insertSeedTemplates()
    if (result.error) {
      alert('Seed failed: ' + result.error)
    } else {
      alert(`Inserted ${result.inserted} templates`)
      load()
    }
    setSeeding(false)
  }

  const handleToggleActive = async (e, tmpl) => {
    e.stopPropagation()
    await updateTemplate(tmpl.id, { is_active: !tmpl.is_active })
    load()
  }

  const handleDelete = async (e, tmpl) => {
    e.stopPropagation()
    if (!confirm(`Delete "${tmpl.name}"?`)) return
    await deleteTemplate(tmpl.id)
    load()
  }

  const filtered = filter === 'all' ? templates : templates.filter(t => t.category === filter)

  return (
    <div>
      <div className="tl-head">
        <div className="tl-title">Visual Templates</div>
        <button className="tl-btn seed" onClick={handleSeed} disabled={seeding}>
          {seeding ? 'SEEDING...' : 'SEED DEFAULTS'}
        </button>
        <button className="tl-btn" onClick={() => navigate('/admin/templates/new')}>
          + NEW TEMPLATE
        </button>
      </div>

      <div className="tl-filter">
        {CATEGORIES.map(cat => (
          <button key={cat} className={`tl-chip${filter === cat ? ' active' : ''}`} onClick={() => setFilter(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="tl-empty">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="tl-empty">No templates found. Click "Seed Defaults" to add the initial 11 templates.</div>
      ) : (
        <div className="tl-grid">
          {filtered.map(tmpl => (
            <div key={tmpl.id} className="tl-card" onClick={() => navigate(`/admin/templates/${tmpl.id}`)}>
              <div className="tl-card-active" style={{ background: tmpl.is_active ? '#3dd68c' : '#ff5050' }} title={tmpl.is_active ? 'Active' : 'Inactive'} />
              <div className="tl-card-name">{tmpl.name}</div>
              <div className="tl-card-slug">{tmpl.slug}</div>
              <span className={`tl-card-cat ${tmpl.category}`}>{tmpl.category}</span>
              <div className="tl-card-render">render: {tmpl.render_type} | v{tmpl.version}</div>
              <div className="tl-card-actions">
                <button className="tl-card-btn" onClick={e => handleToggleActive(e, tmpl)}>
                  {tmpl.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                </button>
                <button className="tl-card-btn danger" onClick={e => handleDelete(e, tmpl)}>DELETE</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
