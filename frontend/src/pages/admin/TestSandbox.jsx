/**
 * Test sandbox — paste transcript, run pipeline, see step-by-step results.
 */

import { useState, useEffect } from 'react'
import { preFilterTemplates } from '../../services/templateService'
import { generateCanvas } from '../../services/chartAI'
import TemplateRenderer from '../../components/TemplateRenderer'
import useTemplates from '../../hooks/useTemplates'

const CSS = `
.sb-title{font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:24px;}
.sb-textarea{width:100%;min-height:160px;padding:14px 18px;border:1px solid var(--border);border-radius:14px;background:var(--bg);color:var(--text);font-size:13px;font-family:'JetBrains Mono',monospace;outline:none;resize:vertical;line-height:1.6;}
.sb-textarea:focus{border-color:var(--accent);}
.sb-actions{display:flex;gap:12px;margin:16px 0;}
.sb-btn{padding:10px 20px;border-radius:10px;font-size:12px;font-weight:600;font-family:'JetBrains Mono',monospace;letter-spacing:1px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;transition:all .2s;}
.sb-btn:hover{background:var(--accent);color:#06080c;}
.sb-btn:disabled{opacity:.5;cursor:not-allowed;}
.sb-btn.secondary{border-color:var(--border);color:var(--text-dim);}
.sb-section{margin-top:24px;}
.sb-section-title{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--accent);margin-bottom:12px;display:flex;align-items:center;gap:8px;}
.sb-step{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:12px;}
.sb-step-head{font-size:12px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:8px;}
.sb-step-count{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-dim);}
.sb-chip{display:inline-block;padding:3px 8px;border-radius:6px;font-size:10px;font-family:'JetBrains Mono',monospace;background:var(--surface-2);color:var(--text-dim);margin:2px;}
.sb-visual{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:12px;}
.sb-visual-head{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
.sb-visual-slug{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent);}
.sb-visual-conf{font-family:'JetBrains Mono',monospace;font-size:11px;padding:2px 6px;border-radius:4px;}
.sb-loading{color:var(--text-dim);padding:20px;text-align:center;}
[data-theme="light"] .sb-step,[data-theme="light"] .sb-visual{background:#fff;}
`

export default function TestSandbox() {
  const [text, setText] = useState('')
  const [running, setRunning] = useState(false)
  const [preFiltered, setPreFiltered] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const { getTemplate } = useTemplates()

  useEffect(() => {
    const id = 'sb-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = CSS
      document.head.appendChild(style)
    }
  }, [])

  const handlePreFilter = async () => {
    if (!text.trim()) return
    const { candidates, error: err } = await preFilterTemplates(text)
    if (err) { setError(err); return }
    setPreFiltered(candidates)
  }

  const handleFullPipeline = async () => {
    if (!text.trim()) return
    setRunning(true)
    setError(null)
    setResults(null)

    // Step 1: Pre-filter (client-side preview)
    const { candidates } = await preFilterTemplates(text)
    setPreFiltered(candidates)

    // Step 2-5: Full pipeline via API (useTemplates mode)
    try {
      const res = await fetch('/api/generate-canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, useTemplates: true }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data)
    } catch (err) {
      setError(err.message)
    }
    setRunning(false)
  }

  return (
    <div>
      <div className="sb-title">Test Sandbox</div>

      <textarea className="sb-textarea" value={text} onChange={e => setText(e.target.value)} placeholder="Paste a meeting transcript here..." />

      <div className="sb-actions">
        <button className="sb-btn secondary" onClick={handlePreFilter} disabled={!text.trim()}>
          PRE-FILTER ONLY
        </button>
        <button className="sb-btn" onClick={handleFullPipeline} disabled={running || !text.trim()}>
          {running ? 'RUNNING PIPELINE...' : 'RUN FULL PIPELINE'}
        </button>
      </div>

      {error && <div style={{ color: '#ff5050', fontSize: 13, marginTop: 12 }}>{error}</div>}

      {preFiltered && (
        <div className="sb-section">
          <div className="sb-section-title">Step 1: Pre-Filtered Candidates <span className="sb-step-count">({preFiltered.length} templates)</span></div>
          <div className="sb-step">
            {preFiltered.map(t => (
              <span key={t.id || t.slug} className="sb-chip" title={`Score: ${t._score}`}>
                {t.slug} ({t._score})
              </span>
            ))}
          </div>
        </div>
      )}

      {running && <div className="sb-loading">Running selection pipeline...</div>}

      {results && (
        <div className="sb-section">
          <div className="sb-section-title">Pipeline Results</div>

          {results._pipeline && (
            <div className="sb-step">
              <div className="sb-step-head">Pipeline Stats</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono',monospace" }}>
                Mode: {results._pipeline.mode} | Candidates: {results._pipeline.candidateCount} | Selected: {results._pipeline.selectedCount} | Time: {results._pipeline.timeMs}ms
              </div>
            </div>
          )}

          <div className="sb-section-title">Generated Visuals <span className="sb-step-count">({results.visuals?.length || 0})</span></div>
          {(results.visuals || []).map((v, i) => {
            const tmpl = v.template_slug ? getTemplate(v.template_slug) : null
            return (
              <div key={i} className="sb-visual">
                <div className="sb-visual-head">
                  <span className="sb-visual-slug">{v.template_slug || v.type}</span>
                  {v.confidence != null && (
                    <span className="sb-visual-conf" style={{
                      background: v.confidence >= 75 ? 'rgba(61,214,140,0.12)' : v.confidence >= 60 ? 'rgba(255,159,67,0.12)' : 'rgba(255,80,80,0.12)',
                      color: v.confidence >= 75 ? '#3dd68c' : v.confidence >= 60 ? '#ff9f43' : '#ff5050',
                    }}>
                      {v.confidence}%
                    </span>
                  )}
                </div>
                {tmpl && v.schema_data ? (
                  <TemplateRenderer template={tmpl} schemaData={v.schema_data} />
                ) : (
                  <pre style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'auto', maxHeight: 200 }}>
                    {JSON.stringify(v.schema_data || v, null, 2)}
                  </pre>
                )}
                {v.explanation && (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    {v.explanation}
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
