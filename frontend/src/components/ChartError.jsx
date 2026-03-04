import { memo } from 'react'

const ERROR_CSS = `
.chart-error{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;gap:16px;width:100%;min-height:250px;text-align:center;}
.chart-error-icon{font-size:36px;opacity:0.6;}
.chart-error-title{font-size:15px;font-weight:600;color:#e8eaf0;}
.chart-error-msg{font-size:12px;color:#ef4444;max-width:350px;line-height:1.6;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:12px 16px;}
.chart-error-retry{padding:10px 24px;background:linear-gradient(135deg,#3dd68c,#2bc47a);color:#06080c;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .25s cubic-bezier(0.4,0,0.2,1);}
.chart-error-retry:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(61,214,140,0.3);}
`

function ChartError({ error, onRetry }) {
  return (
    <>
      <style>{ERROR_CSS}</style>
      <div className="chart-error">
        <div className="chart-error-icon">⚠️</div>
        <div className="chart-error-title">Could not generate visualization</div>
        <div className="chart-error-msg">{error}</div>
        {onRetry && (
          <button className="chart-error-retry" onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    </>
  )
}

export default memo(ChartError)
