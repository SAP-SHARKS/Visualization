import { memo } from 'react'
import { CHART_TYPES, CHART_LABELS } from '../schemas/chartSchemas'

const SELECTOR_CSS = `
.chart-type-selector{display:flex;gap:4px;flex-wrap:wrap;}
.chart-type-btn{padding:6px 14px;border-radius:7px;font-size:11px;font-weight:600;color:#6b7280;cursor:pointer;transition:all .25s cubic-bezier(0.4,0,0.2,1);border:1px solid transparent;background:none;font-family:'DM Sans',sans-serif;}
.chart-type-btn:hover{color:#e8eaf0;border-color:rgba(61,214,140,0.2);background:rgba(61,214,140,0.04);}
.chart-type-btn.active{background:linear-gradient(135deg,#3dd68c,#2bc47a);color:#06080c;border-color:transparent;box-shadow:0 2px 12px rgba(61,214,140,0.3);}
.chart-type-btn.auto-btn.active{background:linear-gradient(135deg,#a78bfa,#8b5cf6);box-shadow:0 2px 12px rgba(167,139,250,0.3);}
[data-theme="light"] .chart-type-btn{color:#7AAACE;}
[data-theme="light"] .chart-type-btn:hover{color:#355872;border-color:rgba(53,88,114,0.2);background:rgba(53,88,114,0.04);}
[data-theme="light"] .chart-type-btn.active{background:linear-gradient(135deg,#355872,#7AAACE);color:#F7F8F0;box-shadow:0 2px 12px rgba(53,88,114,0.25);}
[data-theme="light"] .chart-type-btn.auto-btn.active{background:linear-gradient(135deg,#7c3aed,#a78bfa);box-shadow:0 2px 12px rgba(124,58,237,0.25);}
`

function ChartTypeSelector({ forcedType, onTypeChange, currentType, loading }) {
  return (
    <>
      <style>{SELECTOR_CSS}</style>
      <div className="chart-type-selector">
        <button
          className={`chart-type-btn auto-btn${!forcedType ? ' active' : ''}`}
          onClick={() => onTypeChange(null)}
          disabled={loading}
        >
          Auto {currentType && !forcedType ? `(${CHART_LABELS[currentType]})` : ''}
        </button>
        {CHART_TYPES.map(type => (
          <button
            key={type}
            className={`chart-type-btn${forcedType === type ? ' active' : ''}`}
            onClick={() => onTypeChange(type)}
            disabled={loading}
          >
            {CHART_LABELS[type]}
          </button>
        ))}
      </div>
    </>
  )
}

export default memo(ChartTypeSelector)
