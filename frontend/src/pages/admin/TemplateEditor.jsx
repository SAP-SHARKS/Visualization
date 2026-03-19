/**
 * Template editor — edit all fields with live preview.
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTemplateById, createTemplate, updateTemplate } from '../../services/templateService'
import TemplateRenderer from '../../components/TemplateRenderer'

const CSS = `
.te-page{display:grid;grid-template-columns:1fr 1fr;gap:24px;min-height:calc(100vh - 56px);}
.te-form{display:flex;flex-direction:column;gap:16px;overflow-y:auto;max-height:calc(100vh - 80px);padding-right:12px;}
.te-form::-webkit-scrollbar{width:4px;}
.te-form::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}
.te-preview{position:sticky;top:0;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;overflow-y:auto;max-height:calc(100vh - 80px);}
.te-preview::-webkit-scrollbar{width:4px;}
.te-preview::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}
.te-head{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
.te-title{font-family:'DM Serif Display',serif;font-size:22px;flex:1;}
.te-label{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-dim);font-family:'JetBrains Mono',monospace;margin-bottom:4px;}
.te-input{width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s;}
.te-input:focus{border-color:var(--accent);}
.te-textarea{width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font-size:12px;font-family:'JetBrains Mono',monospace;outline:none;min-height:120px;resize:vertical;transition:border-color .2s;line-height:1.5;}
.te-textarea:focus{border-color:var(--accent);}
.te-select{width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px;outline:none;}
.te-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.te-btn{padding:10px 20px;border-radius:10px;font-size:12px;font-weight:600;font-family:'JetBrains Mono',monospace;letter-spacing:1px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;transition:all .2s;}
.te-btn:hover{background:var(--accent);color:#06080c;}
.te-btn:disabled{opacity:.5;cursor:not-allowed;}
.te-btn.secondary{border-color:var(--border);color:var(--text-dim);}
.te-btn.secondary:hover{border-color:var(--text);color:var(--text);background:transparent;}
.te-error{color:#ff5050;font-size:12px;margin-top:4px;}
.te-preview-label{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--text-dim);margin-bottom:16px;}
@media(max-width:900px){.te-page{grid-template-columns:1fr;}.te-preview{position:static;max-height:none;}}
`

const DEFAULT_TEMPLATE = {
  name: '',
  slug: '',
  category: 'analytical',
  render_type: 'html',
  react_component_name: '',
  schema: {},
  html_template: '',
  css_template: '',
  css_variables_used: [],
  trigger_signals: [],
  meeting_affinity: [],
  conversation_pattern: '',
  min_data_points: 1,
  max_data_points: 10,
  example_output: null,
}

export default function TemplateEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [form, setForm] = useState({ ...DEFAULT_TEMPLATE })
  const [schemaStr, setSchemaStr] = useState('{}')
  const [exampleStr, setExampleStr] = useState('{}')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    const cssId = 'te-css'
    if (!document.getElementById(cssId)) {
      const style = document.createElement('style')
      style.id = cssId
      style.textContent = CSS
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    getTemplateById(id).then(({ template, error: err }) => {
      if (err) { setError(err); setLoading(false); return }
      setForm(template)
      setSchemaStr(JSON.stringify(template.schema || {}, null, 2))
      setExampleStr(JSON.stringify(template.example_output || {}, null, 2))
      setLoading(false)
    })
  }, [id, isNew])

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const schema = JSON.parse(schemaStr)
      let example_output = null
      try { example_output = JSON.parse(exampleStr) } catch {}

      const payload = {
        ...form,
        schema,
        example_output,
        trigger_signals: typeof form.trigger_signals === 'string'
          ? form.trigger_signals.split(',').map(s => s.trim()).filter(Boolean)
          : form.trigger_signals,
        meeting_affinity: typeof form.meeting_affinity === 'string'
          ? form.meeting_affinity.split(',').map(s => s.trim()).filter(Boolean)
          : form.meeting_affinity,
        css_variables_used: typeof form.css_variables_used === 'string'
          ? form.css_variables_used.split(',').map(s => s.trim()).filter(Boolean)
          : form.css_variables_used,
      }

      // Remove fields that shouldn't be sent on create/update
      delete payload.id
      delete payload.created_at
      delete payload.updated_at
      delete payload._score

      if (isNew) {
        const { template, error: err } = await createTemplate(payload)
        if (err) throw new Error(err)
        navigate(`/admin/templates/${template.id}`, { replace: true })
      } else {
        const { error: err } = await updateTemplate(id, payload)
        if (err) throw new Error(err)
      }
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  // Preview data
  const previewData = useMemo(() => {
    try { return JSON.parse(exampleStr) } catch { return {} }
  }, [exampleStr])

  const previewTemplate = useMemo(() => ({
    ...form,
    schema: (() => { try { return JSON.parse(schemaStr) } catch { return {} } })(),
  }), [form, schemaStr])

  if (loading) return <div style={{ color: 'var(--text-dim)', padding: 40 }}>Loading...</div>

  return (
    <div>
      <div className="te-head">
        <div className="te-title">{isNew ? 'New Template' : `Edit: ${form.name}`}</div>
        <button className="te-btn secondary" onClick={() => navigate('/admin/templates')}>CANCEL</button>
        <button className="te-btn" onClick={handleSave} disabled={saving}>{saving ? 'SAVING...' : 'SAVE'}</button>
      </div>
      {error && <div className="te-error">{error}</div>}

      <div className="te-page">
        <div className="te-form">
          <div className="te-row">
            <div>
              <div className="te-label">Name</div>
              <input className="te-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Key Takeaways" />
            </div>
            <div>
              <div className="te-label">Slug</div>
              <input className="te-input" value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="takeaways" />
            </div>
          </div>

          <div className="te-row">
            <div>
              <div className="te-label">Category</div>
              <select className="te-select" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="always">always</option>
                <option value="structural">structural</option>
                <option value="analytical">analytical</option>
                <option value="data">data</option>
                <option value="reference">reference</option>
              </select>
            </div>
            <div>
              <div className="te-label">Render Type</div>
              <select className="te-select" value={form.render_type} onChange={e => set('render_type', e.target.value)}>
                <option value="html">html</option>
                <option value="mermaid">mermaid</option>
                <option value="d3-mindmap">d3-mindmap</option>
                <option value="react-component">react-component</option>
              </select>
            </div>
          </div>

          {form.render_type === 'react-component' && (
            <div>
              <div className="te-label">React Component Name</div>
              <input className="te-input" value={form.react_component_name || ''} onChange={e => set('react_component_name', e.target.value)} placeholder="TimelineRenderer" />
            </div>
          )}

          <div>
            <div className="te-label">JSON Schema (what the AI fills)</div>
            <textarea className="te-textarea" style={{ minHeight: 180 }} value={schemaStr} onChange={e => setSchemaStr(e.target.value)} />
          </div>

          <div>
            <div className="te-label">HTML Template ({{variable}} placeholders)</div>
            <textarea className="te-textarea" style={{ minHeight: 150 }} value={form.html_template} onChange={e => set('html_template', e.target.value)} />
          </div>

          <div>
            <div className="te-label">CSS Template</div>
            <textarea className="te-textarea" style={{ minHeight: 100 }} value={form.css_template} onChange={e => set('css_template', e.target.value)} />
          </div>

          <div>
            <div className="te-label">Trigger Signals (comma-separated)</div>
            <input className="te-input" value={Array.isArray(form.trigger_signals) ? form.trigger_signals.join(', ') : form.trigger_signals} onChange={e => set('trigger_signals', e.target.value)} placeholder="process, workflow, steps" />
          </div>

          <div>
            <div className="te-label">Meeting Affinity (comma-separated)</div>
            <input className="te-input" value={Array.isArray(form.meeting_affinity) ? form.meeting_affinity.join(', ') : form.meeting_affinity} onChange={e => set('meeting_affinity', e.target.value)} placeholder="technical, strategy" />
          </div>

          <div>
            <div className="te-label">Conversation Pattern (when to use)</div>
            <textarea className="te-textarea" style={{ minHeight: 60 }} value={form.conversation_pattern || ''} onChange={e => set('conversation_pattern', e.target.value)} />
          </div>

          <div className="te-row">
            <div>
              <div className="te-label">Min Data Points</div>
              <input className="te-input" type="number" value={form.min_data_points} onChange={e => set('min_data_points', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <div className="te-label">Max Data Points</div>
              <input className="te-input" type="number" value={form.max_data_points} onChange={e => set('max_data_points', parseInt(e.target.value) || 10)} />
            </div>
          </div>

          <div>
            <div className="te-label">Example Output (JSON for preview)</div>
            <textarea className="te-textarea" style={{ minHeight: 120 }} value={exampleStr} onChange={e => setExampleStr(e.target.value)} />
          </div>
        </div>

        <div className="te-preview">
          <div className="te-preview-label">Live Preview</div>
          {previewData && Object.keys(previewData).length > 0 ? (
            <TemplateRenderer template={previewTemplate} schemaData={previewData} />
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: 13, fontStyle: 'italic' }}>
              Add example output JSON to see a live preview
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
