import { memo, useCallback } from 'react'
import { toPng } from 'html-to-image'

const EXPORT_CSS = `
.chart-export-btn{position:absolute;top:12px;right:12px;padding:6px 12px;background:rgba(14,17,23,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#6b7280;font-size:10px;font-family:'JetBrains Mono',monospace;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:5px;z-index:5;text-transform:uppercase;letter-spacing:0.5px;backdrop-filter:blur(8px);}
.chart-export-btn:hover{color:#e8eaf0;border-color:rgba(61,214,140,0.3);background:rgba(14,17,23,0.95);}
.chart-export-btn:active{transform:scale(0.97);}
.chart-export-btn svg{width:12px;height:12px;}
[data-theme="light"] .chart-export-btn{background:rgba(255,255,255,0.85);border-color:rgba(53,88,114,0.1);color:#7AAACE;}
[data-theme="light"] .chart-export-btn:hover{color:#1a2d3d;border-color:rgba(53,88,114,0.25);background:rgba(255,255,255,0.95);}
`

function ChartExportButton({ targetRef, filename = 'chart' }) {
  const handleExport = useCallback(async () => {
    if (!targetRef?.current) return

    try {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light'
      const dataUrl = await toPng(targetRef.current, {
        backgroundColor: isLight ? '#F7F8F0' : '#06080c',
        pixelRatio: 2,
        style: {
          padding: '24px',
        },
      })

      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Export failed:', err)
    }
  }, [targetRef, filename])

  return (
    <>
      <style>{EXPORT_CSS}</style>
      <button className="chart-export-btn" onClick={handleExport} title="Download as PNG">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        PNG
      </button>
    </>
  )
}

export default memo(ChartExportButton)
