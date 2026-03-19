/**
 * Template analytics dashboard — usage counts, feedback ratings.
 */

import { useState, useEffect } from 'react'
import { fetchAllTemplates, getTemplateStats } from '../../services/templateService'

const CSS = `
.an-title{font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:24px;}
.an-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}
.an-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;transition:all .3s;}
.an-card:hover{border-color:rgba(61,214,140,0.2);}
.an-card-name{font-size:15px;font-weight:600;margin-bottom:4px;}
.an-card-slug{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-dim);margin-bottom:12px;}
.an-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
.an-stat{text-align:center;}
.an-stat-val{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;}
.an-stat-label{font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;font-family:'JetBrains Mono',monospace;}
.an-bar{height:6px;background:var(--border);border-radius:3px;margin-top:12px;overflow:hidden;display:flex;}
.an-bar-pos{background:#3dd68c;height:100%;}
.an-bar-neg{background:#ff5050;height:100%;}
.an-empty{text-align:center;padding:60px 20px;color:var(--text-dim);}
[data-theme="light"] .an-card{background:#fff;}
`

export default function Analytics() {
  const [templates, setTemplates] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = 'an-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = CSS
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      fetchAllTemplates(true),
      getTemplateStats(),
    ]).then(([tmplRes, statsRes]) => {
      setTemplates(tmplRes.templates || [])
      setStats(statsRes.stats || [])
      setLoading(false)
    })
  }, [])

  const statsMap = {}
  for (const s of stats) {
    statsMap[s.templateId] = s
  }

  if (loading) return <div className="an-empty">Loading analytics...</div>

  return (
    <div>
      <div className="an-title">Template Analytics</div>
      {templates.length === 0 ? (
        <div className="an-empty">No templates found. Seed defaults first.</div>
      ) : (
        <div className="an-grid">
          {templates.map(tmpl => {
            const s = statsMap[tmpl.id] || { uses: 0, thumbsUp: 0, thumbsDown: 0 }
            const total = s.thumbsUp + s.thumbsDown
            const posW = total > 0 ? (s.thumbsUp / total) * 100 : 50
            return (
              <div key={tmpl.id} className="an-card">
                <div className="an-card-name">{tmpl.name}</div>
                <div className="an-card-slug">{tmpl.slug} | {tmpl.category}</div>
                <div className="an-stats">
                  <div className="an-stat">
                    <div className="an-stat-val" style={{ color: 'var(--accent)' }}>{s.uses}</div>
                    <div className="an-stat-label">Uses</div>
                  </div>
                  <div className="an-stat">
                    <div className="an-stat-val" style={{ color: '#3dd68c' }}>{s.thumbsUp}</div>
                    <div className="an-stat-label">Thumbs Up</div>
                  </div>
                  <div className="an-stat">
                    <div className="an-stat-val" style={{ color: '#ff5050' }}>{s.thumbsDown}</div>
                    <div className="an-stat-label">Thumbs Down</div>
                  </div>
                </div>
                {total > 0 && (
                  <div className="an-bar">
                    <div className="an-bar-pos" style={{ width: `${posW}%` }} />
                    <div className="an-bar-neg" style={{ width: `${100 - posW}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
