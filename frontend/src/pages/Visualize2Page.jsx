import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { generateCanvas } from '../services/chartAI'
import { saveCanvasSession, getSession } from '../services/sessionStorage'

const MermaidRenderer = lazy(() => import('../components/charts/MermaidRenderer'))
const MindmapRenderer = lazy(() => import('../components/charts/MindmapRenderer'))
const TimelineRenderer = lazy(() => import('../components/charts/TimelineRenderer'))

const PAGE_CSS = `
:root {
  --bg: #06080c;
  --surface: #0e1117;
  --surface-2: #151921;
  --border: rgba(255,255,255,0.06);
  --text: #e8eaf0;
  --text-dim: #6b7280;
  --accent: #3dd68c;
  --accent-glow: rgba(61,214,140,0.12);
}
[data-theme="light"] {
  --bg: #f8f9fc;
  --surface: #ffffff;
  --surface-2: #f0f2f8;
  --border: rgba(99,102,241,0.1);
  --text: #1e1b4b;
  --text-dim: #6b7280;
  --accent: #6366f1;
  --accent-glow: rgba(99,102,241,0.12);
}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;overflow-x:hidden;}

.v2-header{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(6,8,12,0.85);backdrop-filter:blur(24px);border-bottom:1px solid var(--border);padding:14px 40px;display:flex;align-items:center;gap:16px;}
.v2-header::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(61,214,140,0.15),transparent);}
.v2-logo{font-family:'DM Serif Display',serif;font-size:20px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;cursor:pointer;}
.v2-logo span{color:var(--text-dim);font-size:12px;font-family:'DM Sans';margin-left:10px;-webkit-text-fill-color:var(--text-dim);}
.v2-nav{display:flex;gap:4px;background:rgba(14,17,23,0.8);border-radius:12px;padding:4px;border:1px solid var(--border);overflow-x:auto;max-width:700px;}
.v2-pill{padding:7px 14px;border-radius:9px;font-size:11px;font-weight:500;color:var(--text-dim);cursor:pointer;transition:all 0.25s;border:none;background:none;font-family:'DM Sans',sans-serif;white-space:nowrap;}
.v2-pill:hover{color:var(--text);background:rgba(255,255,255,0.06);}
.v2-pill.active{background:linear-gradient(135deg,#3dd68c,#2bc47a);color:#06080c;font-weight:600;box-shadow:0 2px 12px rgba(61,214,140,0.3);}

.v2-content{padding-top:70px;max-width:1200px;margin:0 auto;padding-left:32px;padding-right:32px;padding-bottom:80px;}

.v2-hero{padding:48px 0 32px;text-align:center;}
.v2-hero-label{font-family:'JetBrains Mono',monospace;font-size:12px;text-transform:uppercase;letter-spacing:2px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:10px;}
.v2-hero-title{font-family:'DM Serif Display',serif;font-size:38px;letter-spacing:-0.5px;margin-bottom:8px;background:linear-gradient(135deg,#e8eaf0 30%,#8a90a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.v2-hero-sub{color:var(--text-dim);font-size:16px;}

.v2-section{margin-bottom:48px;animation:v2FadeUp .6s ease forwards;opacity:0;}
@keyframes v2FadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
.v2-section-head{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
.v2-section-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.v2-section-label{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--accent);}
.v2-section-title{font-size:20px;font-weight:700;}
.v2-explanation{color:var(--text-dim);font-size:14px;line-height:1.7;margin-top:16px;padding:14px 18px;background:var(--surface-2);border-radius:12px;border-left:3px solid var(--accent);}

/* Takeaways */
.v2-takeaway{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 22px;margin-bottom:10px;display:flex;align-items:flex-start;gap:14px;transition:all .3s;}
.v2-takeaway:hover{border-color:rgba(61,214,140,0.2);transform:translateX(4px);}
.v2-takeaway.highlight{border-color:rgba(61,214,140,0.3);background:linear-gradient(135deg,rgba(61,214,140,0.06),rgba(91,245,220,0.03));}
.v2-takeaway.highlight::before{content:'KEY';font-size:9px;font-weight:700;letter-spacing:1px;background:#3dd68c;color:#06080c;padding:2px 8px;border-radius:6px;font-family:'JetBrains Mono',monospace;}
.v2-takeaway-text{font-size:15px;line-height:1.6;}

/* ELI5 */
.v2-eli5{background:linear-gradient(135deg,rgba(199,125,255,0.08),rgba(0,212,255,0.06));border:1px solid rgba(199,125,255,0.15);border-radius:20px;padding:32px;position:relative;overflow:hidden;}
.v2-eli5::before{content:'';position:absolute;top:-50%;right:-30%;width:60%;height:120%;background:radial-gradient(circle,rgba(199,125,255,0.06),transparent 60%);pointer-events:none;}
.v2-eli5-label{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#c77dff;margin-bottom:12px;}
.v2-eli5-simple{font-size:18px;font-weight:500;line-height:1.7;margin-bottom:16px;}
.v2-eli5-analogy{font-size:14px;color:var(--text-dim);padding:12px 16px;background:rgba(199,125,255,0.06);border-radius:10px;border-left:3px solid #c77dff;}

/* Blindspots */
.v2-blind{background:var(--surface);border:1px solid rgba(255,80,80,0.15);border-radius:14px;padding:18px 22px;margin-bottom:10px;transition:all .3s;}
.v2-blind:hover{border-color:rgba(255,80,80,0.3);transform:translateX(4px);}
.v2-blind-q{font-size:15px;font-weight:600;color:#ff5050;margin-bottom:4px;}
.v2-blind-note{font-size:13px;color:var(--text-dim);}

/* Flowchart */
.v2-chart-wrap{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;min-height:300px;}
.v2-chart-caption{font-size:13px;color:var(--text-dim);text-align:center;margin-top:12px;}

/* Mindmap */
.v2-mindmap-wrap{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;min-height:350px;}

/* Problem/Solution */
.v2-ps-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.v2-ps-col{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;}
.v2-ps-col-title{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;}
.v2-ps-col-title.prob{color:#ff5050;}
.v2-ps-col-title.sol{color:#00ff88;}
.v2-ps-item{font-size:14px;padding:10px 0;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:10px;}
.v2-ps-item:last-child{border-bottom:none;}
.v2-ps-dot{width:8px;height:8px;border-radius:50%;margin-top:6px;flex-shrink:0;}

/* Pros/Cons */
.v2-pc-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.v2-pc-col{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;}
.v2-pc-col-title{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;}
.v2-pc-col-title.pro{color:#00ff88;}
.v2-pc-col-title.con{color:#ff5050;}
.v2-pc-item{font-size:14px;padding:10px 0;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:10px;}
.v2-pc-item:last-child{border-bottom:none;}

/* Comparison */
.v2-comp-table{width:100%;border-collapse:collapse;background:var(--surface);border-radius:16px;overflow:hidden;border:1px solid var(--border);}
.v2-comp-table th{padding:14px 18px;text-align:left;font-size:13px;font-weight:700;color:var(--accent);border-bottom:2px solid var(--border);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;}
.v2-comp-table td{padding:12px 18px;font-size:14px;border-bottom:1px solid var(--border);}
.v2-comp-table tr:last-child td{border-bottom:none;}
.v2-comp-table tr:hover td{background:var(--accent-glow);}

/* Metrics */
.v2-metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;}
.v2-metric{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;text-align:center;position:relative;overflow:hidden;transition:all .3s;}
.v2-metric:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.2);}
.v2-metric::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;transition:opacity .3s;}
.v2-metric:hover::before{opacity:1;}
.v2-metric-value{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;margin-bottom:4px;}
.v2-metric-name{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;}
.v2-metric-ctx{font-size:12px;color:var(--text-dim);margin-top:6px;}

/* Terms */
.v2-term{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 22px;margin-bottom:10px;transition:all .3s;}
.v2-term:hover{border-color:rgba(0,212,255,0.2);transform:translateX(4px);}
.v2-term-word{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:#00d4ff;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;}
.v2-term-def{font-size:14px;color:var(--text-dim);line-height:1.6;}

/* Decisions */
.v2-decision{display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid var(--border);}
.v2-decision:last-child{border-bottom:none;}
.v2-decision-badge{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;letter-spacing:0.8px;white-space:nowrap;}
.v2-decision-badge.MADE{background:rgba(0,255,136,0.12);color:#00ff88;border:1px solid rgba(0,255,136,0.2);}
.v2-decision-badge.PENDING{background:rgba(255,159,67,0.12);color:#ff9f43;border:1px solid rgba(255,159,67,0.2);}
.v2-decision-badge.TABLED{background:rgba(255,80,80,0.12);color:#ff5050;border:1px solid rgba(255,80,80,0.2);}
.v2-decision-text{font-size:14px;line-height:1.6;}

/* Actions */
.v2-action{display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid var(--border);}
.v2-action:last-child{border-bottom:none;}
.v2-action-check{width:20px;height:20px;border-radius:6px;border:2px solid var(--border);flex-shrink:0;margin-top:2px;}
.v2-action-text{font-size:14px;flex:1;}
.v2-action-owner{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent);background:var(--accent-glow);padding:2px 8px;border-radius:6px;white-space:nowrap;}

/* Loading */
.v2-loading{text-align:center;padding:120px 20px;}
.v2-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:v2spin 0.8s linear infinite;margin:0 auto 20px;}
@keyframes v2spin{to{transform:rotate(360deg);}}
.v2-loading-text{color:var(--text-dim);font-size:15px;}
.v2-error{background:rgba(255,80,80,0.08);border:1px solid rgba(255,80,80,0.2);color:#ff5050;padding:16px 24px;border-radius:14px;font-size:14px;text-align:center;margin-top:40px;}

/* Light mode overrides */
[data-theme="light"] .v2-header{background:rgba(255,255,255,0.92);border-bottom-color:rgba(99,102,241,0.08);}
[data-theme="light"] .v2-header::after{background:linear-gradient(90deg,transparent,rgba(99,102,241,0.15),transparent);}
[data-theme="light"] .v2-logo{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;}
[data-theme="light"] .v2-nav{background:rgba(99,102,241,0.04);border-color:rgba(99,102,241,0.08);}
[data-theme="light"] .v2-pill:hover{background:rgba(99,102,241,0.06);}
[data-theme="light"] .v2-pill.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;}
[data-theme="light"] .v2-hero-title{background:linear-gradient(135deg,#1e1b4b 30%,#6366f1);-webkit-background-clip:text;}
[data-theme="light"] .v2-hero-label{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;}
[data-theme="light"] .v2-takeaway{background:#fff;}
[data-theme="light"] .v2-takeaway:hover{border-color:rgba(99,102,241,0.2);}
[data-theme="light"] .v2-takeaway.highlight{border-color:rgba(99,102,241,0.3);background:linear-gradient(135deg,rgba(99,102,241,0.04),rgba(139,92,246,0.03));}
[data-theme="light"] .v2-takeaway.highlight::before{background:#6366f1;color:#fff;}
[data-theme="light"] .v2-eli5{background:linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.04));border-color:rgba(99,102,241,0.12);}
[data-theme="light"] .v2-blind{background:#fff;border-color:rgba(239,68,68,0.12);}
[data-theme="light"] .v2-chart-wrap,[data-theme="light"] .v2-mindmap-wrap,[data-theme="light"] .v2-ps-col,[data-theme="light"] .v2-pc-col{background:#fff;}
[data-theme="light"] .v2-metric{background:#fff;}
[data-theme="light"] .v2-term{background:#fff;}
[data-theme="light"] .v2-comp-table{background:#fff;}
/* Transcript Panel */
.v2-split{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:stretch;}
.v2-transcript-panel{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;overflow-y:auto;}
.v2-transcript-panel::-webkit-scrollbar{width:5px;}
.v2-transcript-panel::-webkit-scrollbar-track{background:transparent;}
.v2-transcript-panel::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}
.v2-transcript-panel::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.2);}
.v2-transcript-label{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--accent);margin-bottom:16px;display:flex;align-items:center;gap:8px;}
.v2-transcript-label::before{content:'📝';font-size:14px;}
.v2-transcript-text{font-size:13px;line-height:1.8;color:var(--text-dim);white-space:pre-wrap;word-break:break-word;font-family:'JetBrains Mono',monospace;}
[data-theme="light"] .v2-transcript-panel{background:#fff;}

/* Ask Q&A */
.v2-ask{margin-top:48px;padding:32px;background:var(--surface);border:1px solid var(--border);border-radius:20px;animation:v2FadeUp .6s ease forwards;opacity:0;}
.v2-ask-head{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
.v2-ask-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--accent-glow);border:1px solid var(--border);flex-shrink:0;}
.v2-ask-label{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--accent);}
.v2-ask-row{display:flex;gap:10px;margin-bottom:16px;}
.v2-ask-input{flex:1;padding:14px 18px;border-radius:14px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:15px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s;}
.v2-ask-input:focus{border-color:var(--accent);}
.v2-ask-input::placeholder{color:var(--text-dim);opacity:.5;}
.v2-ask-btn{padding:14px 24px;border-radius:14px;border:none;background:linear-gradient(135deg,var(--accent),#2bc47a);color:#06080c;font-weight:700;font-size:13px;cursor:pointer;font-family:'JetBrains Mono',monospace;letter-spacing:1px;transition:all .2s;}
.v2-ask-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(61,214,140,0.3);}
.v2-ask-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none;}
[data-theme="light"] .v2-ask-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;}
[data-theme="light"] .v2-ask{background:#fff;}
.v2-ask-threads{display:flex;flex-direction:column;gap:10px;max-height:400px;overflow-y:auto;}
.v2-ask-msg{display:flex;gap:12px;padding:14px 16px;border-radius:14px;background:var(--bg);border:1px solid var(--border);}
.v2-ask-avatar{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.v2-ask-avatar.user{background:rgba(91,156,245,0.12);}
.v2-ask-avatar.ai{background:var(--accent-glow);}
.v2-ask-text{font-size:14px;line-height:1.7;color:var(--text);}
[data-theme="light"] .v2-transcript-panel::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);}
[data-theme="light"] .v2-transcript-panel::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.2);}
@media(max-width:700px){
  .v2-ps-grid,.v2-pc-grid{grid-template-columns:1fr;}
  .v2-metrics-grid{grid-template-columns:1fr 1fr;}
  .v2-content{padding-left:16px;padding-right:16px;}
  .v2-hero-title{font-size:28px;}
  .v2-split{grid-template-columns:1fr;}
}
`

const SECTION_META = {
  takeaways: { icon: '🎯', label: 'Key Takeaways' },
  eli5: { icon: '💡', label: 'ELI5' },
  blindspots: { icon: '⚠️', label: 'Blind Spots' },
  flowchart: { icon: '🔀', label: 'Process Flow' },
  mindmap: { icon: '🧠', label: 'Mind Map' },
  problemsolution: { icon: '🔧', label: 'Problems & Solutions' },
  proscons: { icon: '⚖️', label: 'Pros & Cons' },
  comparison: { icon: '📊', label: 'Comparison' },
  timeline: { icon: '📅', label: 'Timeline' },
  metrics: { icon: '📈', label: 'Metrics' },
  terms: { icon: '📖', label: 'Glossary' },
}

function VisualRenderer({ visual }) {
  const t = visual.type
  if (t === 'takeaways') {
    return (
      <div>
        {(visual.items || []).map((item, i) => (
          <div key={i} className={`v2-takeaway${item.highlight ? ' highlight' : ''}`}>
            <div className="v2-takeaway-text">{item.text}</div>
          </div>
        ))}
      </div>
    )
  }
  if (t === 'eli5') {
    return (
      <div className="v2-eli5">
        <div className="v2-eli5-label">Explain Like I'm 5</div>
        <div className="v2-eli5-simple">{visual.simple}</div>
        {visual.analogy && <div className="v2-eli5-analogy">{visual.analogy}</div>}
      </div>
    )
  }
  if (t === 'blindspots') {
    return (
      <div>
        {(visual.items || []).map((item, i) => (
          <div key={i} className="v2-blind">
            <div className="v2-blind-q">{item.question}</div>
            <div className="v2-blind-note">{item.note}</div>
          </div>
        ))}
      </div>
    )
  }
  if (t === 'flowchart') {
    return (
      <div className="v2-chart-wrap">
        <Suspense fallback={<div style={{textAlign:'center',padding:40,color:'var(--text-dim)'}}>Loading chart...</div>}>
          <MermaidRenderer data={{ mermaidCode: visual.mermaid }} />
        </Suspense>
        {visual.caption && <div className="v2-chart-caption">{visual.caption}</div>}
      </div>
    )
  }
  if (t === 'mindmap') {
    // Reshape branches format to root/children format for MindmapRenderer
    const root = {
      label: visual.center || 'Topic',
      children: (visual.branches || []).map(b => ({
        label: b.label,
        children: (b.children || []).map(c => ({ label: typeof c === 'string' ? c : c.label || '' }))
      }))
    }
    return (
      <div className="v2-mindmap-wrap">
        <Suspense fallback={<div style={{textAlign:'center',padding:40,color:'var(--text-dim)'}}>Loading mindmap...</div>}>
          <MindmapRenderer data={{ root }} />
        </Suspense>
      </div>
    )
  }
  if (t === 'problemsolution') {
    return (
      <div className="v2-ps-grid">
        <div className="v2-ps-col">
          <div className="v2-ps-col-title prob">Problems</div>
          {(visual.problems || []).map((p, i) => (
            <div key={i} className="v2-ps-item"><div className="v2-ps-dot" style={{background:'#ff5050'}} />{p}</div>
          ))}
        </div>
        <div className="v2-ps-col">
          <div className="v2-ps-col-title sol">Solutions</div>
          {(visual.solutions || []).map((s, i) => (
            <div key={i} className="v2-ps-item"><div className="v2-ps-dot" style={{background:'#00ff88'}} />{s}</div>
          ))}
        </div>
      </div>
    )
  }
  if (t === 'proscons') {
    return (
      <div>
        {visual.topic && <div style={{fontSize:15,fontWeight:600,marginBottom:16,color:'var(--text)'}}>Topic: {visual.topic}</div>}
        <div className="v2-pc-grid">
          <div className="v2-pc-col">
            <div className="v2-pc-col-title pro">Pros</div>
            {(visual.pros || []).map((p, i) => (
              <div key={i} className="v2-pc-item"><span style={{color:'#00ff88',fontWeight:700}}>+</span> {p}</div>
            ))}
          </div>
          <div className="v2-pc-col">
            <div className="v2-pc-col-title con">Cons</div>
            {(visual.cons || []).map((c, i) => (
              <div key={i} className="v2-pc-item"><span style={{color:'#ff5050',fontWeight:700}}>-</span> {c}</div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (t === 'comparison') {
    return (
      <table className="v2-comp-table">
        <thead>
          <tr>
            <th>Criteria</th>
            {(visual.options || []).map((opt, i) => <th key={i}>{opt}</th>)}
          </tr>
        </thead>
        <tbody>
          {(visual.criteria || []).map((row, i) => (
            <tr key={i}>
              <td style={{fontWeight:600}}>{row.name}</td>
              {(row.values || []).map((v, j) => <td key={j}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  if (t === 'timeline') {
    // Reshape to TimelineRenderer format
    const events = (visual.items || []).map(item => ({
      date: item.time,
      title: item.event,
      description: item.note || '',
      icon: item.done ? '✅' : '🔵',
    }))
    return (
      <Suspense fallback={<div style={{textAlign:'center',padding:40,color:'var(--text-dim)'}}>Loading timeline...</div>}>
        <TimelineRenderer data={{ events }} />
      </Suspense>
    )
  }
  if (t === 'metrics') {
    return (
      <div className="v2-metrics-grid">
        {(visual.items || []).map((m, i) => (
          <div key={i} className="v2-metric" style={{'--mc': m.color || '#00d4ff'}}>
            <div className="v2-metric-value" style={{color: m.color || '#00d4ff'}}>{m.value}</div>
            <div className="v2-metric-name">{m.name}</div>
            {m.context && <div className="v2-metric-ctx">{m.context}</div>}
            <style>{`.v2-metric:nth-child(${i+1})::before{background:${m.color || '#00d4ff'};}`}</style>
          </div>
        ))}
      </div>
    )
  }
  if (t === 'terms') {
    return (
      <div>
        {(visual.items || []).map((item, i) => (
          <div key={i} className="v2-term">
            <div className="v2-term-word">{item.term}</div>
            <div className="v2-term-def">{item.definition}</div>
          </div>
        ))}
      </div>
    )
  }
  return <div style={{color:'var(--text-dim)',fontStyle:'italic'}}>Unknown visual type: {t}</div>
}

export default function Visualize2Page() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const state = location.state
  const historySessionId = searchParams.get('session')

  useEffect(() => {
    if (!state?.content && !historySessionId) navigate('/', { replace: true })
  }, [state, historySessionId, navigate])

  const [content, setContent] = useState(state?.content || '')
  const [title, setTitle] = useState('Analyzing...')
  const [subtitle, setSubtitle] = useState('')
  const [visuals, setVisuals] = useState([])
  const [decisions, setDecisions] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeNav, setActiveNav] = useState(null)
  const [sessionSaved, setSessionSaved] = useState(false)
  const [isHistoryMode, setIsHistoryMode] = useState(!!historySessionId)
  const [qaInput, setQaInput] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [qaThreads, setQaThreads] = useState([])
  const sectionRefs = useRef({})

  useEffect(() => {
    const id = 'v2-page-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = PAGE_CSS
      document.head.appendChild(style)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  // Load from history
  useEffect(() => {
    if (!historySessionId) return
    setLoading(true)
    getSession(historySessionId).then(({ session, error: err }) => {
      if (err) { setError(err); setLoading(false); return }
      setTitle(session.title || 'Untitled Canvas')
      setSubtitle(session.subtitle || '')
      setContent(session.transcript || '')
      const canvas = session.canvas_data || {}
      setVisuals(canvas.visuals || [])
      setDecisions(canvas.decisions || [])
      setActions(canvas.actions || [])
      setSessionSaved(true)
      setIsHistoryMode(true)
      setLoading(false)
    })
  }, [historySessionId])

  // Auto-save after generation
  useEffect(() => {
    if (sessionSaved || isHistoryMode || loading || visuals.length === 0 || !content) return
    saveCanvasSession({
      title,
      subtitle,
      transcript: content,
      visuals,
      decisions,
      actions,
    }).then(({ sessionId, error: err }) => {
      if (err) {
        console.error('Canvas save failed:', err)
      } else {
        console.log('Canvas session saved:', sessionId)
        setSessionSaved(true)
      }
    })
  }, [visuals, loading, sessionSaved, isHistoryMode])

  // Generate canvas
  useEffect(() => {
    if (!content || visuals.length > 0 || loading || isHistoryMode) return
    let cancelled = false
    setLoading(true)
    setError(null)

    generateCanvas(content).then(({ title: t, subtitle: s, visuals: v, decisions: d, actions: a, error: err }) => {
      if (cancelled) return
      if (err) { setError(err); setLoading(false); return }
      if (t) setTitle(t)
      if (s) setSubtitle(s)
      setVisuals(v || [])
      setDecisions(d || [])
      setActions(a || [])
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [content])

  // Scroll nav
  useEffect(() => {
    if (visuals.length === 0) return
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible.length > 0) setActiveNav(visible[0].target.id)
    }, { rootMargin: '-80px 0px -60% 0px' })

    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [visuals])

  function scrollTo(id) {
    const el = sectionRefs.current[id]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function askQuestion() {
    const question = qaInput.trim()
    if (!question || qaLoading) return
    const apiKey = import.meta.env.ANTHROPIC_API_KEY
    if (!apiKey) return
    setQaLoading(true)
    setQaInput('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 500,
          system: 'You are a helpful meeting assistant. Answer questions about the meeting transcript concisely in 2-4 sentences.',
          messages: [{ role: 'user', content: `Meeting transcript:\n${content}\n\nQuestion: ${question}` }]
        })
      })
      const data = await res.json()
      const answer = data.content?.[0]?.text || 'Could not generate an answer.'
      setQaThreads(prev => [...prev, { q: question, a: answer }])
    } catch {
      setQaThreads(prev => [...prev, { q: question, a: 'Failed to get a response. Please try again.' }])
    }
    setQaLoading(false)
  }

  if (!state?.content && !historySessionId) return null

  const navItems = visuals.map(v => v.type).filter(t => SECTION_META[t])
  if (decisions.length > 0) navItems.push('decisions')
  if (actions.length > 0) navItems.push('actions')

  return (
    <div>
      <header className="v2-header">
        <div className="v2-logo" onClick={() => navigate('/')}>VisualScript <span>Canvas</span></div>
        {!loading && visuals.length > 0 && (
          <nav className="v2-nav">
            {navItems.map(key => (
              <button key={key} className={`v2-pill${activeNav === `v2-${key}` ? ' active' : ''}`} onClick={() => scrollTo(`v2-${key}`)}>
                {SECTION_META[key]?.label || key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </nav>
        )}
      </header>

      <div className="v2-content">
        <div className="v2-hero">
          <div className="v2-hero-label">Meeting Canvas</div>
          <h1 className="v2-hero-title">{title}</h1>
          <p className="v2-hero-sub">{subtitle || (loading ? 'Generating canvas...' : '')}</p>
        </div>

        {loading && (
          <div className="v2-loading">
            <div className="v2-spinner" />
            <div className="v2-loading-text">Analyzing transcript and building canvas...</div>
          </div>
        )}

        {error && <div className="v2-error">{error}</div>}

        {visuals.map((visual, idx) => {
          const meta = SECTION_META[visual.type] || { icon: '📌', label: visual.type }
          const isTakeaways = visual.type === 'takeaways'
          return (
            <div key={idx} className="v2-section" id={`v2-${visual.type}`} ref={el => sectionRefs.current[`v2-${visual.type}`] = el} style={{animationDelay: `${idx * 0.1}s`}}>
              <div className="v2-section-head">
                <div className="v2-section-icon" style={{background:'var(--accent-glow)',border:'1px solid var(--border)'}}>{meta.icon}</div>
                <div>
                  <div className="v2-section-label">{meta.label}</div>
                </div>
              </div>
              {isTakeaways ? (
                <div className="v2-split">
                  <div>
                    <VisualRenderer visual={visual} />
                    {visual.explanation && <div className="v2-explanation">{visual.explanation}</div>}
                  </div>
                  <div className="v2-transcript-panel">
                    <div className="v2-transcript-label">Full Transcript</div>
                    <div className="v2-transcript-text">{content}</div>
                  </div>
                </div>
              ) : (
                <>
                  <VisualRenderer visual={visual} />
                  {visual.explanation && <div className="v2-explanation">{visual.explanation}</div>}
                </>
              )}
            </div>
          )
        })}

        {decisions.length > 0 && (
          <div className="v2-section" id="v2-decisions" ref={el => sectionRefs.current['v2-decisions'] = el}>
            <div className="v2-section-head">
              <div className="v2-section-icon" style={{background:'var(--accent-glow)',border:'1px solid var(--border)'}}>🏛️</div>
              <div><div className="v2-section-label">Decisions</div></div>
            </div>
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'8px 24px'}}>
              {decisions.map((d, i) => (
                <div key={i} className="v2-decision">
                  <span className={`v2-decision-badge ${d.status}`}>{d.status}</span>
                  <span className="v2-decision-text">{d.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {actions.length > 0 && (
          <div className="v2-section" id="v2-actions" ref={el => sectionRefs.current['v2-actions'] = el}>
            <div className="v2-section-head">
              <div className="v2-section-icon" style={{background:'var(--accent-glow)',border:'1px solid var(--border)'}}>✅</div>
              <div><div className="v2-section-label">Action Items</div></div>
            </div>
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'8px 24px'}}>
              {actions.map((a, i) => (
                <div key={i} className="v2-action">
                  <div className="v2-action-check" />
                  <span className="v2-action-text">{a.text}</span>
                  {a.owner && <span className="v2-action-owner">@{a.owner}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ask Q&A */}
        {!loading && visuals.length > 0 && (
          <div className="v2-ask" style={{ animationDelay: `${visuals.length * 0.1 + 0.2}s` }}>
            <div className="v2-ask-head">
              <div className="v2-ask-icon">❓</div>
              <div className="v2-ask-label">Ask a Question</div>
            </div>
            <div className="v2-ask-row">
              <input className="v2-ask-input" placeholder="Ask about the meeting..." value={qaInput} onChange={e => setQaInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !qaLoading && askQuestion()} />
              <button className="v2-ask-btn" onClick={askQuestion} disabled={qaLoading || !qaInput.trim()}>{qaLoading ? 'Thinking...' : 'ASK'}</button>
            </div>
            {qaThreads.length > 0 && (
              <div className="v2-ask-threads">
                {qaThreads.map((t, i) => (
                  <div key={i}>
                    <div className="v2-ask-msg"><div className="v2-ask-avatar user">👤</div><div className="v2-ask-text">{t.q}</div></div>
                    <div className="v2-ask-msg" style={{ marginTop: 6 }}><div className="v2-ask-avatar ai">⚡</div><div className="v2-ask-text">{t.a}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
