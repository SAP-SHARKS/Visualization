import { memo } from 'react'

const LOADING_CSS = `
.chart-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;gap:20px;width:100%;min-height:300px;}
.chart-loading-spinner{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,0.06);border-top-color:#3dd68c;animation:chartSpin 0.8s linear infinite;}
@keyframes chartSpin{to{transform:rotate(360deg);}}
.chart-loading-text{font-size:13px;color:#6b7280;font-family:'DM Sans',sans-serif;}
.chart-loading-sub{font-size:11px;color:#4a5060;font-family:'JetBrains Mono',monospace;letter-spacing:0.5px;}
.chart-skeleton{width:100%;display:flex;flex-direction:column;gap:12px;padding:0 20px;}
.chart-skeleton-bar{height:12px;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,0.03),rgba(255,255,255,0.06),rgba(255,255,255,0.03));background-size:200% 100%;animation:chartShimmer 1.5s ease infinite;}
@keyframes chartShimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
.chart-skeleton-bar:nth-child(1){width:85%;}
.chart-skeleton-bar:nth-child(2){width:70%;}
.chart-skeleton-bar:nth-child(3){width:90%;}
.chart-skeleton-bar:nth-child(4){width:60%;}
`

function ChartLoading() {
  return (
    <>
      <style>{LOADING_CSS}</style>
      <div className="chart-loading">
        <div className="chart-loading-spinner"></div>
        <div className="chart-loading-text">Analyzing your text...</div>
        <div className="chart-loading-sub">Generating visualization with AI</div>
        <div className="chart-skeleton">
          <div className="chart-skeleton-bar"></div>
          <div className="chart-skeleton-bar"></div>
          <div className="chart-skeleton-bar"></div>
          <div className="chart-skeleton-bar"></div>
        </div>
      </div>
    </>
  )
}

export default memo(ChartLoading)
