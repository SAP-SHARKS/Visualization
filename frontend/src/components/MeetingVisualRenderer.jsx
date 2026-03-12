import { useEffect, useRef, useState, memo } from 'react'
import mermaid from 'mermaid'
import { useTheme } from '../context/ThemeContext'

// ==================== CSS ====================
const STYLES = `
.mv-mermaid{display:flex;justify-content:center;align-items:center;min-height:200px;padding:16px;overflow:auto;}
.mv-mermaid svg{max-width:100%;height:auto;}

.mv-proscons{display:flex;gap:16px;padding:16px;}
.mv-proscons-col{flex:1;display:flex;flex-direction:column;gap:8px;}
.mv-proscons-heading{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-family:'JetBrains Mono',monospace;padding-bottom:8px;border-bottom:2px solid;}
.mv-proscons-heading.pros{color:#10b981;border-color:#10b981;}
.mv-proscons-heading.cons{color:#ef4444;border-color:#ef4444;}
[data-theme="light"] .mv-proscons-heading.pros{color:#059669;}
[data-theme="light"] .mv-proscons-heading.cons{color:#dc2626;}
.mv-proscons-item{font-size:13px;color:var(--text);line-height:1.6;padding:6px 10px;border-radius:8px;background:var(--surface-2);}
.mv-proscons-topic{font-size:14px;font-weight:600;color:var(--text);text-align:center;margin-bottom:12px;}

.mv-comparison{padding:16px;overflow-x:auto;}
.mv-comparison table{width:100%;border-collapse:collapse;font-size:13px;}
.mv-comparison th{text-align:left;padding:10px 12px;font-weight:600;color:var(--accent);font-family:'JetBrains Mono',monospace;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid var(--border);}
.mv-comparison td{padding:10px 12px;color:var(--text);border-bottom:1px solid var(--border);}
.mv-comparison tr:last-child td{border-bottom:none;}
.mv-comparison .crit-name{font-weight:600;color:var(--text-dim);font-size:12px;white-space:nowrap;}

.mv-mindmap{padding:20px;display:flex;flex-direction:column;align-items:center;gap:16px;}
.mv-mindmap-center{font-size:16px;font-weight:700;color:var(--accent);padding:12px 24px;border:2px solid var(--accent);border-radius:24px;background:var(--accent-glow);}
.mv-mindmap-branches{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;width:100%;}
.mv-mindmap-branch{flex:1;min-width:160px;max-width:280px;background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:14px;}
.mv-mindmap-branch-label{font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border);}
.mv-mindmap-child{font-size:12px;color:var(--text-dim);padding:3px 0;padding-left:12px;position:relative;}
.mv-mindmap-child::before{content:'';position:absolute;left:0;top:50%;width:6px;height:6px;border-radius:50%;background:var(--accent);transform:translateY(-50%);opacity:0.6;}

.mv-keypoints{padding:16px;display:flex;flex-direction:column;gap:8px;}
.mv-keypoint{display:flex;gap:12px;align-items:flex-start;padding:10px 14px;background:var(--surface-2);border-radius:10px;border:1px solid var(--border);}
.mv-keypoint-num{font-size:11px;font-weight:700;color:var(--accent);font-family:'JetBrains Mono',monospace;min-width:20px;height:20px;display:flex;align-items:center;justify-content:center;background:var(--accent-glow);border-radius:6px;flex-shrink:0;margin-top:1px;}
.mv-keypoint-text{font-size:13px;color:var(--text);line-height:1.6;}

.mv-bullets{padding:8px 16px 16px;display:flex;flex-direction:column;gap:4px;}
.mv-bullet{font-size:12px;color:var(--text-dim);line-height:1.5;padding-left:14px;position:relative;}
.mv-bullet::before{content:'•';position:absolute;left:0;color:var(--accent);font-weight:700;}

.mv-error{color:var(--text-dim);font-size:13px;text-align:center;padding:32px 20px;}
`

// ==================== Mermaid Counter ====================
let mermaidCounter = 0

// ==================== Mermaid Chart ====================
function MermaidChart({ definition }) {
  const containerRef = useRef(null)
  const { theme } = useTheme()
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!definition || !containerRef.current) return

    const render = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'light' ? 'default' : 'dark',
          themeVariables: theme === 'light' ? {
            primaryColor: '#e0e7ff',
            primaryBorderColor: '#6366f1',
            primaryTextColor: '#1e293b',
            lineColor: '#94a3b8',
            secondaryColor: '#f0fdf4',
            tertiaryColor: '#fef3c7',
          } : {
            primaryColor: 'rgba(61,214,140,0.2)',
            primaryBorderColor: '#3dd68c',
            primaryTextColor: '#e8eaf0',
            lineColor: '#64748b',
            secondaryColor: 'rgba(96,165,250,0.2)',
            tertiaryColor: 'rgba(245,158,11,0.2)',
          },
          flowchart: { curve: 'basis', padding: 20 },
        })

        const id = `mermaid-${Date.now()}-${++mermaidCounter}`
        const { svg } = await mermaid.render(id, definition)
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          setError(null)
        }
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError('Failed to render diagram')
      }
    }

    render()
  }, [definition, theme])

  if (error) return <div className="mv-error">{error}</div>
  return <div ref={containerRef} className="mv-mermaid" />
}

// ==================== ProsCons ====================
function ProsCons({ content }) {
  if (!content) return null
  return (
    <div>
      {content.topic && <div className="mv-proscons-topic">{content.topic}</div>}
      <div className="mv-proscons">
        <div className="mv-proscons-col">
          <div className="mv-proscons-heading pros">Pros</div>
          {(content.pros || []).map((p, i) => (
            <div key={i} className="mv-proscons-item">{p}</div>
          ))}
        </div>
        <div className="mv-proscons-col">
          <div className="mv-proscons-heading cons">Cons</div>
          {(content.cons || []).map((c, i) => (
            <div key={i} className="mv-proscons-item">{c}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ==================== Comparison ====================
function Comparison({ content }) {
  if (!content || !content.options || !content.criteria) return null
  return (
    <div className="mv-comparison">
      <table>
        <thead>
          <tr>
            <th></th>
            {content.options.map((opt, i) => <th key={i}>{opt}</th>)}
          </tr>
        </thead>
        <tbody>
          {content.criteria.map((c, i) => (
            <tr key={i}>
              <td className="crit-name">{c.name}</td>
              {(c.values || []).map((v, j) => <td key={j}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ==================== Mindmap ====================
function Mindmap({ content }) {
  if (!content) return null
  return (
    <div className="mv-mindmap">
      <div className="mv-mindmap-center">{content.center}</div>
      <div className="mv-mindmap-branches">
        {(content.branches || []).map((b, i) => (
          <div key={i} className="mv-mindmap-branch">
            <div className="mv-mindmap-branch-label">{b.label}</div>
            {(b.children || []).map((child, j) => (
              <div key={j} className="mv-mindmap-child">{child}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== Key Points ====================
function KeyPoints({ content, bulletPoints }) {
  const points = content?.points || bulletPoints || []
  if (points.length === 0) return null
  return (
    <div className="mv-keypoints">
      {points.map((p, i) => (
        <div key={i} className="mv-keypoint">
          <span className="mv-keypoint-num">{i + 1}</span>
          <span className="mv-keypoint-text">{p}</span>
        </div>
      ))}
    </div>
  )
}

// ==================== Bullet Points ====================
function BulletPoints({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mv-bullets">
      {items.map((b, i) => (
        <div key={i} className="mv-bullet">{b}</div>
      ))}
    </div>
  )
}

// ==================== Main Router ====================
function MeetingVisualRenderer({ data }) {
  if (!data) return null

  const { visualType, content, bulletPoints } = data
  const mermaidTypes = ['flowchart', 'processmap', 'decisiontree', 'timeline']

  let mainContent = null

  if (mermaidTypes.includes(visualType) && content?.mermaidDefinition) {
    mainContent = <MermaidChart definition={content.mermaidDefinition} />
  } else {
    switch (visualType) {
      case 'proscons':
        mainContent = <ProsCons content={content} />
        break
      case 'comparison':
        mainContent = <Comparison content={content} />
        break
      case 'mindmap':
        mainContent = <Mindmap content={content} />
        break
      case 'keypoints':
        mainContent = <KeyPoints content={content} bulletPoints={bulletPoints} />
        break
      default:
        mainContent = <KeyPoints content={content} bulletPoints={bulletPoints} />
    }
  }

  // Show bullet points below mermaid/proscons/comparison/mindmap charts
  const showBullets = bulletPoints && bulletPoints.length > 0 && visualType !== 'keypoints'

  return (
    <>
      <style>{STYLES}</style>
      {mainContent}
      {showBullets && <BulletPoints items={bulletPoints} />}
    </>
  )
}

export default memo(MeetingVisualRenderer)
