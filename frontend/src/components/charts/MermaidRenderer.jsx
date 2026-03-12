import { useEffect, useRef, useState, memo } from 'react'

let mermaidCounter = 0

// Dynamically import mermaid to avoid SSR issues
let mermaidModule = null
const getMermaid = async () => {
  if (!mermaidModule) {
    const m = await import('mermaid')
    mermaidModule = m.default
  }
  return mermaidModule
}

const STYLES = `
.mermaid-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  padding: 20px;
  overflow: auto;
  transition: opacity 0.4s ease;
}
.mermaid-container svg {
  max-width: 100%;
  height: auto;
}
.mermaid-error {
  color: var(--text-dim);
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  text-align: center;
  padding: 24px;
  background: var(--surface-2);
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-all;
}
.mermaid-fallback-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--accent);
  margin-bottom: 8px;
  font-weight: 600;
}
`

function MermaidRenderer({ data }) {
  const containerRef = useRef(null)
  const prevCodeRef = useRef(null)
  const [error, setError] = useState(null)

  const mermaidCode = data?.mermaidCode || ''

  useEffect(() => {
    if (!mermaidCode || !containerRef.current) return

    const render = async () => {
      try {
        const mermaid = await getMermaid()

        // Detect theme from document
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light'

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          themeVariables: isDark ? {
            primaryColor: 'rgba(61,214,140,0.2)',
            primaryBorderColor: '#3dd68c',
            primaryTextColor: '#e8eaf0',
            lineColor: '#64748b',
            secondaryColor: 'rgba(96,165,250,0.2)',
            tertiaryColor: 'rgba(245,158,11,0.2)',
            actorBkg: 'rgba(61,214,140,0.15)',
            actorBorder: '#3dd68c',
            actorTextColor: '#e8eaf0',
            signalColor: '#e8eaf0',
            signalTextColor: '#e8eaf0',
          } : {
            primaryColor: '#e0e7ff',
            primaryBorderColor: '#6366f1',
            primaryTextColor: '#1e293b',
            lineColor: '#94a3b8',
            secondaryColor: '#f0fdf4',
            tertiaryColor: '#fef3c7',
            actorBkg: '#e0e7ff',
            actorBorder: '#6366f1',
            actorTextColor: '#1e293b',
            signalColor: '#1e293b',
            signalTextColor: '#1e293b',
          },
          flowchart: { curve: 'basis', padding: 20 },
          sequence: { mirrorActors: false, bottomMarginAdj: 10 },
        })

        const id = `mermaid-${Date.now()}-${++mermaidCounter}`

        // Smooth transition on update
        const isUpdate = prevCodeRef.current && prevCodeRef.current !== mermaidCode
        if (isUpdate && containerRef.current) {
          containerRef.current.style.opacity = '0.3'
        }

        const { svg } = await mermaid.render(id, mermaidCode)

        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          setError(null)

          if (isUpdate) {
            // Fade back in
            requestAnimationFrame(() => {
              if (containerRef.current) {
                containerRef.current.style.opacity = '1'
              }
            })
          }
        }

        prevCodeRef.current = mermaidCode
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError(mermaidCode)
      }
    }

    render()
  }, [mermaidCode])

  if (error) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="mermaid-error">
          <div className="mermaid-fallback-label">Mermaid Syntax (render failed)</div>
          {error}
        </div>
      </>
    )
  }

  return (
    <>
      <style>{STYLES}</style>
      <div ref={containerRef} className="mermaid-container" />
    </>
  )
}

export default memo(MermaidRenderer)
