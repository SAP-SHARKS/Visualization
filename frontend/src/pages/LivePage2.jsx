import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'

const MermaidRenderer = lazy(() => import('../components/charts/MermaidRenderer'))
const MindmapRenderer = lazy(() => import('../components/charts/MindmapRenderer'))

// ── Claude Analysis Prompt (same as MVP) ─────────────────
const ANALYSIS_PROMPT = `You are a meeting intelligence AI. Analyze this meeting transcript segment and return a JSON canvas.

RESPOND ONLY WITH VALID JSON — no markdown, no backticks.

Schema:
{
  "currentTopic": "What is being discussed RIGHT NOW — 5-8 words",
  "eli5Now": "1-2 plain sentences: what's happening in this meeting right now, for someone who just looked up",
  "takeawaysNow": [
    { "text": "key point from this segment", "highlight": false }
  ],
  "visuals": [ /* 2-4 detail visual sections — pick what fits the new content */ ],
  "decisions": [ { "status": "MADE|PENDING|TABLED", "text": "..." } ],
  "actions": [ { "text": "...", "owner": "" } ]
}

RULES:
- takeawaysNow: 2-4 items, highlight:true on the most important one
- visuals: pick 2-4 from the types below based on what the NEW content contains
  - If process/steps → flowchart
  - If NO process → mindmap AND/OR problemsolution
  - If debate → proscons
  - If options being compared → comparison
  - If dates/schedule → timeline
  - If numbers → metrics
  - If jargon → terms
  - ALWAYS include blindspots
- Every visual needs an "explanation" field with 1-2 sentences of genuine insight

Visual schemas:

"takeaways": { "type":"takeaways","items":[{"text":"...","highlight":false}],"explanation":"..." }
"flowchart": { "type":"flowchart","mermaid":"graph TD\\n  A[X] --> B[Y]","caption":"...","explanation":"..." }
"mindmap": { "type":"mindmap","center":"topic","color":"#26de81","branches":[{"label":"x","children":["y"]}],"explanation":"..." }
"problemsolution": { "type":"problemsolution","problems":["..."],"solutions":["..."],"explanation":"..." }
"proscons": { "type":"proscons","topic":"...","pros":["..."],"cons":["..."],"explanation":"..." }
"comparison": { "type":"comparison","options":["A","B"],"criteria":[{"name":"x","values":["a","b"]}],"explanation":"..." }
"timeline": { "type":"timeline","items":[{"time":"Q1","event":"...","note":"...","done":false}],"explanation":"..." }
"metrics": { "type":"metrics","items":[{"value":"$1M","name":"METRIC","context":"context","color":"#00ff88"}],"explanation":"..." }
"terms": { "type":"terms","items":[{"term":"TERM","definition":"..."}],"explanation":"..." }
"blindspots": { "type":"blindspots","items":[{"question":"...","note":"..."}],"explanation":"..." }
"eli5": { "type":"eli5","simple":"...","analogy":"...","explanation":"..." }`

const ANALYSIS_INTERVAL_MS = 45000
const MIN_NEW_WORDS = 20

// ── CSS ──────────────────────────────────────────────────
const LIVE2_CSS = `
:root{--bg:#06080c;--surface:#0e1117;--surface-2:#151921;--border:rgba(255,255,255,0.06);--text:#e8eaf0;--text-dim:#6b7280;--accent:#3dd68c;--accent-glow:rgba(61,214,140,0.12);}
[data-theme="light"]{--bg:#f8f9fc;--surface:#ffffff;--surface-2:#f0f2f8;--border:rgba(99,102,241,0.1);--text:#1e1b4b;--text-dim:#6b7280;--accent:#6366f1;--accent-glow:rgba(99,102,241,0.12);}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;}

.lp-page{display:grid;grid-template-columns:340px 1fr;height:100vh;overflow:hidden;background:var(--bg);}

/* ── SIDEBAR ── */
.lp-sidebar{background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;}
.lp-sb-head{padding:16px 20px;border-bottom:1px solid var(--border);}
.lp-sb-logo{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
.lp-sb-logo-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:lp-pulse 2s ease-in-out infinite;}
@keyframes lp-pulse{0%,100%{opacity:1;box-shadow:0 0 8px var(--accent)}50%{opacity:.5;box-shadow:0 0 2px var(--accent)}}
.lp-sb-logo-text{font-family:'DM Serif Display',serif;font-size:16px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.3px;}
[data-theme="light"] .lp-sb-logo-text{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;}
.lp-live-badge{margin-left:auto;font-size:9px;padding:2px 8px;border-radius:10px;font-family:'JetBrains Mono',monospace;letter-spacing:1px;background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.2);display:none;}
.lp-live-badge.active{display:block;animation:lp-blink 1.5s ease-in-out infinite;}
@keyframes lp-blink{0%,100%{opacity:1}50%{opacity:.3}}

.lp-sb-label{font-size:9px;color:var(--text-dim);letter-spacing:2px;font-family:'JetBrains Mono',monospace;margin-bottom:5px;text-transform:uppercase;}
.lp-sb-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:11px;width:100%;outline:none;transition:border-color .2s;}
.lp-sb-input:focus{border-color:var(--accent);}
.lp-sb-input::placeholder{color:rgba(255,255,255,0.15);}
[data-theme="light"] .lp-sb-input::placeholder{color:rgba(0,0,0,0.2);}

/* Mic controls */
.lp-mic-zone{padding:14px 20px;border-bottom:1px solid var(--border);}
.lp-mic-btn{width:100%;padding:14px;border:none;border-radius:12px;font-size:12px;font-weight:700;letter-spacing:1.5px;font-family:'JetBrains Mono',monospace;cursor:pointer;transition:all .25s;text-transform:uppercase;}
.lp-mic-btn.idle{background:linear-gradient(135deg,rgba(61,214,140,0.1),rgba(61,214,140,0.05));color:var(--accent);border:1px solid rgba(61,214,140,0.2);}
.lp-mic-btn.idle:hover{background:linear-gradient(135deg,rgba(61,214,140,0.2),rgba(61,214,140,0.1));border-color:rgba(61,214,140,0.4);}
.lp-mic-btn.recording{background:linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.08));color:#ef4444;border:1px solid rgba(239,68,68,0.3);animation:lp-glow 1.5s ease-in-out infinite;}
@keyframes lp-glow{0%,100%{border-color:rgba(239,68,68,0.3)}50%{border-color:rgba(239,68,68,0.6)}}
.lp-stop-btn{width:100%;padding:10px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--text-dim);font-size:11px;font-family:'JetBrains Mono',monospace;cursor:pointer;margin-top:8px;transition:all .15s;letter-spacing:1px;display:none;}
.lp-stop-btn:hover{border-color:rgba(239,68,68,0.3);color:#ef4444;}
.lp-stop-btn.visible{display:block;}

/* Status bar */
.lp-status{padding:10px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;}
.lp-status-dot{width:6px;height:6px;border-radius:50%;transition:all .3s;flex-shrink:0;}
.lp-status-dot.idle{background:var(--text-dim);opacity:.3;}
.lp-status-dot.listening{background:#00ff88;box-shadow:0 0 6px #00ff88;}
.lp-status-dot.analyzing{background:#ffd93d;box-shadow:0 0 6px #ffd93d;}
.lp-status-text{font-size:10px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;letter-spacing:1px;flex:1;text-transform:uppercase;}
.lp-status-timer{font-size:9px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;letter-spacing:1px;opacity:.6;}

/* Transcript */
.lp-tx-zone{flex:1;overflow:hidden;display:flex;flex-direction:column;padding:14px 20px;}
.lp-tx-scroll{flex:1;overflow-y:auto;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.8;color:var(--text-dim);}
.lp-tx-scroll::-webkit-scrollbar{width:4px;}
.lp-tx-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}
.lp-tx-final{color:var(--text);display:inline;}
.lp-tx-interim{color:var(--text-dim);font-style:italic;display:inline;}
.lp-tx-placeholder{color:var(--text-dim);font-style:italic;opacity:.4;}
.lp-tx-timestamp{color:var(--text-dim);font-size:9px;letter-spacing:1px;display:block;margin-top:8px;margin-bottom:2px;opacity:.5;}

/* Analyze button */
.lp-analyze-btn{margin:10px 20px;padding:10px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--text-dim);font-size:10px;font-family:'JetBrains Mono',monospace;cursor:pointer;transition:all .15s;letter-spacing:1px;text-transform:uppercase;flex-shrink:0;}
.lp-analyze-btn:hover:not(:disabled){border-color:var(--accent);color:var(--accent);}
.lp-analyze-btn:disabled{opacity:.3;cursor:not-allowed;}

/* Error */
.lp-error{margin:0 20px 12px;color:#ef4444;font-size:10px;padding:8px 12px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:8px;flex-shrink:0;}

/* Back link */
.lp-back{font-size:11px;color:var(--text-dim);text-decoration:none;padding:8px 20px;border-top:1px solid var(--border);font-family:'JetBrains Mono',monospace;letter-spacing:1px;text-transform:uppercase;flex-shrink:0;transition:color .2s;}
.lp-back:hover{color:var(--accent);}

/* ── CANVAS ── */
.lp-canvas{overflow-y:auto;display:flex;flex-direction:column;background:var(--bg);}
.lp-canvas::-webkit-scrollbar{width:5px;}
.lp-canvas::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}

/* Live Summary (sticky top) */
.lp-live-top{flex-shrink:0;background:var(--surface);border-bottom:1px solid var(--border);padding:20px 28px;position:sticky;top:0;z-index:10;}
.lp-lt-waiting{display:flex;align-items:center;gap:12px;padding:20px 0;opacity:.3;}
.lp-lt-waiting-icon{font-size:40px;}
.lp-lt-waiting-text{font-size:11px;color:var(--text-dim);letter-spacing:2px;font-family:'JetBrains Mono',monospace;line-height:2;text-transform:uppercase;}
.lp-lt-content{animation:lp-fadeUp .35s ease;}
@keyframes lp-fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.lp-lt-topic-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.lp-lt-topic-label{font-size:9px;color:var(--text-dim);letter-spacing:2px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;}
.lp-lt-topic{font-family:'DM Serif Display',serif;font-size:18px;font-weight:700;color:var(--text);line-height:1.3;flex:1;}
.lp-lt-updated{font-size:9px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;white-space:nowrap;opacity:.6;}
.lp-lt-eli5{font-size:14px;color:var(--text-dim);line-height:1.7;margin-bottom:12px;font-weight:300;}
.lp-lt-takeaways{display:flex;flex-wrap:wrap;gap:8px;}
.lp-lt-tk{padding:6px 12px;background:var(--accent-glow);border:1px solid rgba(61,214,140,0.15);border-radius:20px;font-size:12px;color:var(--accent);line-height:1.4;}
.lp-lt-tk.hl{background:rgba(61,214,140,0.15);border-color:rgba(61,214,140,0.3);font-weight:600;}
.lp-updating{display:flex;align-items:center;gap:8px;margin-top:10px;}
.lp-upd-spinner{width:12px;height:12px;border:2px solid var(--border);border-top:2px solid #ffd93d;border-radius:50%;animation:lp-spin .7s linear infinite;}
@keyframes lp-spin{to{transform:rotate(360deg)}}
.lp-upd-text{font-size:9px;color:var(--text-dim);letter-spacing:2px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;}

/* Section timestamp divider */
.lp-section-ts{display:flex;align-items:center;gap:12px;margin:16px 28px 12px;opacity:.5;}
.lp-section-ts::before,.lp-section-ts::after{content:'';flex:1;height:1px;background:var(--border);}
.lp-section-ts span{font-size:9px;color:var(--text-dim);letter-spacing:2px;font-family:'JetBrains Mono',monospace;white-space:nowrap;}

/* Visual Sections */
.lp-cv-sections{flex:1;padding:20px 28px;display:flex;flex-direction:column;gap:0;}
.lp-vs{border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:18px;animation:lp-fadeUp .4s ease both;}
.lp-vs-head{display:flex;align-items:center;gap:12px;padding:14px 22px;border-bottom:1px solid var(--border);background:var(--surface);}
.lp-vs-icon{font-size:20px;}
.lp-vs-label{font-size:11px;font-weight:700;letter-spacing:2px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;}
.lp-vs-chip{margin-left:auto;font-size:10px;padding:3px 8px;border-radius:8px;font-family:'JetBrains Mono',monospace;letter-spacing:1px;}
.lp-vs-body{padding:20px 24px;background:var(--bg);}
.lp-vs-explanation{padding:14px 20px;border-top:1px solid var(--border);font-size:14px;color:var(--text-dim);line-height:1.7;background:var(--surface);}
.lp-vs-exp-label{font-size:10px;color:var(--text-dim);letter-spacing:2px;font-family:'JetBrains Mono',monospace;margin-bottom:6px;text-transform:uppercase;}

/* Visual: Takeaways */
.lp-tk-row{display:flex;align-items:stretch;margin-bottom:8px;border-radius:10px;overflow:hidden;border:1px solid rgba(61,214,140,0.1);}
.lp-tk-num{background:var(--accent-glow);padding:12px 14px;font-size:12px;color:var(--accent);font-family:'JetBrains Mono',monospace;display:flex;align-items:center;border-right:1px solid rgba(61,214,140,0.1);min-width:44px;justify-content:center;font-weight:700;}
.lp-tk-text{padding:12px 16px;font-size:15px;color:var(--text);line-height:1.6;flex:1;display:flex;align-items:center;}
.lp-tk-row.hl .lp-tk-num{background:rgba(61,214,140,0.15);}
.lp-tk-row.hl .lp-tk-text{color:var(--accent);font-weight:600;}

/* Visual: ELI5 */
.lp-eli5-body{font-size:18px;color:var(--text);line-height:1.7;font-weight:500;}
.lp-eli5-analogy{margin-top:14px;padding:12px 16px;background:rgba(199,125,255,0.06);border-left:3px solid #c77dff;border-radius:0 10px 10px 0;font-size:14px;color:var(--text-dim);line-height:1.6;font-style:italic;}

/* Visual: Blindspots */
.lp-bs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;}
.lp-bs-card{padding:16px 18px;background:rgba(255,80,80,0.04);border:1px solid rgba(255,80,80,0.12);border-radius:14px;}
.lp-bs-q{font-size:15px;font-weight:600;color:#ff5050;margin-bottom:4px;line-height:1.5;}
.lp-bs-note{font-size:13px;color:var(--text-dim);line-height:1.6;}

/* Visual: Flowchart */
.lp-diagram-wrap{background:var(--surface);border-radius:10px;padding:14px;overflow:auto;}
.lp-diagram-wrap svg{max-width:100%;}
.lp-diagram-cap{font-size:10px;color:var(--text-dim);font-style:italic;margin-top:8px;}

/* Visual: Mindmap */
.lp-mm-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;}
.lp-mm-center{padding:12px 28px;border-radius:28px;font-size:16px;font-weight:700;text-align:center;}
.lp-mm-branches{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;width:100%;}
.lp-mm-branch{border-radius:12px;padding:14px 16px;min-width:160px;max-width:220px;flex:1;}
.lp-mm-blabel{font-size:14px;font-weight:600;margin-bottom:8px;}
.lp-mm-child{font-size:13px;color:var(--text-dim);padding:4px 0 4px 10px;border-left:1px solid var(--border);margin-bottom:3px;line-height:1.5;}

/* Visual: Problem/Solution */
.lp-ps-wrap{display:grid;grid-template-columns:1fr 40px 1fr;align-items:stretch;}
.lp-ps-col{padding:14px 16px;border-radius:10px;}
.lp-ps-prob{background:rgba(255,80,80,0.04);border:1px solid rgba(255,80,80,0.12);}
.lp-ps-sol{background:rgba(61,214,140,0.04);border:1px solid rgba(61,214,140,0.12);}
.lp-ps-arrow{display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--text-dim);opacity:.3;}
.lp-ps-label{font-size:11px;font-weight:700;letter-spacing:2px;font-family:'JetBrains Mono',monospace;margin-bottom:12px;text-transform:uppercase;}
.lp-ps-item{font-size:14px;margin-bottom:8px;padding:8px 12px;border-radius:8px;line-height:1.6;display:flex;gap:8px;align-items:flex-start;}

/* Visual: Pros/Cons */
.lp-pc-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.lp-pc-topic{font-size:12px;color:var(--text-dim);margin-bottom:12px;font-style:italic;}
.lp-pro-col{background:rgba(61,214,140,0.04);border:1px solid rgba(61,214,140,0.12);border-radius:10px;padding:12px;}
.lp-con-col{background:rgba(255,80,80,0.04);border:1px solid rgba(255,80,80,0.12);border-radius:10px;padding:12px;}
.lp-pc-label{font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:12px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;}
.lp-pc-item{font-size:14px;margin-bottom:8px;padding:8px 12px;border-radius:8px;line-height:1.6;display:flex;gap:8px;}
.lp-pro-item{background:rgba(61,214,140,0.04);color:var(--text);}
.lp-pro-item::before{content:"✓";color:var(--accent);flex-shrink:0;}
.lp-con-item{background:rgba(255,80,80,0.04);color:var(--text);}
.lp-con-item::before{content:"✗";color:#ff5050;flex-shrink:0;}

/* Visual: Comparison */
.lp-cmp-table{width:100%;border-collapse:collapse;font-size:14px;border:1px solid var(--border);border-radius:16px;overflow:hidden;}
.lp-cmp-table th{padding:14px 18px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:1px;border-bottom:2px solid var(--border);color:var(--accent);text-transform:uppercase;font-weight:700;}
.lp-cmp-table td{padding:12px 18px;border-bottom:1px solid var(--border);font-size:14px;}
.lp-cmp-table tr:last-child td{border-bottom:none;}
.lp-cmp-table tr:hover td{background:var(--accent-glow);}

/* Visual: Timeline */
.lp-tl-wrap{position:relative;padding-left:18px;}
.lp-tl-wrap::before{content:'';position:absolute;left:5px;top:8px;bottom:8px;width:2px;background:linear-gradient(to bottom,var(--accent),var(--border));border-radius:2px;}
.lp-tl-item{display:flex;gap:14px;align-items:flex-start;margin-bottom:16px;position:relative;}
.lp-tl-item:last-child{margin-bottom:0;}
.lp-tl-dot{width:12px;height:12px;border-radius:50%;border:2px solid var(--accent);background:var(--bg);flex-shrink:0;margin-top:3px;position:relative;z-index:1;margin-left:-6px;}
.lp-tl-dot.done{background:var(--accent);}
.lp-tl-time{font-size:11px;color:var(--accent);font-family:'JetBrains Mono',monospace;letter-spacing:1px;margin-bottom:3px;}
.lp-tl-event{font-size:14px;color:var(--text);font-weight:500;line-height:1.5;}
.lp-tl-note{font-size:13px;color:var(--text-dim);margin-top:3px;line-height:1.5;}

/* Visual: Metrics */
.lp-met-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;}
.lp-met-card{padding:24px 18px;background:var(--surface);border:1px solid var(--border);border-radius:16px;text-align:center;transition:all .3s;}
.lp-met-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.2);}
.lp-met-val{font-size:32px;font-weight:700;font-family:'JetBrains Mono',monospace;margin-bottom:4px;}
.lp-met-name{font-size:11px;color:var(--text-dim);letter-spacing:1.5px;font-family:'JetBrains Mono',monospace;font-weight:600;text-transform:uppercase;}
.lp-met-ctx{font-size:12px;color:var(--text-dim);margin-top:6px;}

/* Visual: Terms */
.lp-terms-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px;}
.lp-term-card{padding:16px 20px;background:rgba(255,217,61,0.04);border:1px solid rgba(255,217,61,0.12);border-radius:14px;transition:all .3s;}
.lp-term-card:hover{border-color:rgba(0,212,255,0.2);transform:translateX(4px);}
.lp-term-name{font-size:14px;font-weight:700;color:#00d4ff;font-family:'JetBrains Mono',monospace;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;}
.lp-term-def{font-size:14px;color:var(--text-dim);line-height:1.6;}

/* Decisions & Actions */
.lp-da-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.lp-dec-item{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-left:3px solid;border-radius:0 8px 8px 0;margin-bottom:8px;background:var(--surface);}
.lp-dec-status{font-size:10px;font-family:'JetBrains Mono',monospace;font-weight:700;padding:3px 10px;border-radius:6px;letter-spacing:0.8px;white-space:nowrap;flex-shrink:0;}
.lp-dec-text{font-size:14px;color:var(--text);line-height:1.6;}
.lp-act-item{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;background:var(--accent-glow);border:1px solid rgba(61,214,140,0.1);border-radius:8px;margin-bottom:8px;}
.lp-act-cb{width:20px;height:20px;border:2px solid var(--accent);border-radius:6px;flex-shrink:0;margin-top:2px;}
.lp-act-text{font-size:14px;color:var(--text);line-height:1.6;flex:1;}
.lp-act-owner{font-size:11px;color:var(--accent);font-family:'JetBrains Mono',monospace;background:var(--accent-glow);padding:2px 8px;border-radius:6px;white-space:nowrap;}

/* Empty state */
.lp-empty{padding:20px 28px;display:flex;align-items:center;justify-content:center;flex:1;opacity:.2;}
.lp-empty p{font-size:11px;color:var(--text-dim);letter-spacing:2px;font-family:'JetBrains Mono',monospace;text-align:center;line-height:2;text-transform:uppercase;}

/* Ask Q&A */
.lp-ask{padding:20px 28px 80px;border-top:1px solid var(--border);flex-shrink:0;}
.lp-ask-head{font-size:11px;font-weight:700;letter-spacing:2px;font-family:'JetBrains Mono',monospace;color:var(--accent);margin-bottom:14px;text-transform:uppercase;}
.lp-ask-row{display:flex;gap:8px;margin-bottom:12px;}
.lp-ask-input{flex:1;padding:12px 16px;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:15px;font-family:'DM Sans',sans-serif;outline:none;}
.lp-ask-input:focus{border-color:var(--accent);}
.lp-ask-btn{padding:10px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--accent),#2bc47a);color:#06080c;font-weight:700;font-size:12px;cursor:pointer;font-family:'JetBrains Mono',monospace;letter-spacing:1px;transition:all .2s;}
.lp-ask-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(61,214,140,0.3);}
.lp-ask-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none;}
[data-theme="light"] .lp-ask-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;}
.lp-ask-threads{display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;}
.lp-ask-msg{display:flex;gap:10px;padding:10px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--border);}
.lp-ask-avatar{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;}
.lp-ask-avatar.user{background:rgba(91,156,245,0.12);}
.lp-ask-avatar.ai{background:var(--accent-glow);}
.lp-ask-text{font-size:14px;line-height:1.6;color:var(--text);}

/* Light mode */
[data-theme="light"] .lp-sidebar{background:#fff;border-right-color:rgba(99,102,241,0.08);}
[data-theme="light"] .lp-vs{border-color:rgba(99,102,241,0.1);}
[data-theme="light"] .lp-vs-head{background:#fff;}
[data-theme="light"] .lp-live-top{background:#fff;}

@media(max-width:800px){
  .lp-page{grid-template-columns:1fr;grid-template-rows:auto 1fr;}
  .lp-sidebar{max-height:50vh;overflow-y:auto;}
  .lp-ps-wrap{grid-template-columns:1fr;}
  .lp-ps-arrow{display:none;}
  .lp-pc-cols{grid-template-columns:1fr;}
  .lp-da-grid{grid-template-columns:1fr;}
}
`

// ── Visual Config ────────────────────────────────────────
const VIS_CFG = {
  takeaways:       { icon: '✦', label: 'KEY TAKEAWAYS',      color: '#00ff88' },
  flowchart:       { icon: '⬡', label: 'PROCESS FLOW',       color: '#00d4ff' },
  eli5:            { icon: '💡', label: 'IN PLAIN ENGLISH',   color: '#c77dff' },
  blindspots:      { icon: '⚠', label: 'BLIND SPOTS',        color: '#ff8c6b' },
  mindmap:         { icon: '✦', label: 'TOPIC MAP',           color: '#26de81' },
  problemsolution: { icon: '⟳', label: 'PROBLEM → SOLUTION', color: '#ff6b9d' },
  proscons:        { icon: '⚖', label: 'PROS & CONS',         color: '#ff9f43' },
  comparison:      { icon: '≡', label: 'COMPARISON',          color: '#ff9f43' },
  timeline:        { icon: '◈', label: 'TIMELINE',            color: '#00d4ff' },
  metrics:         { icon: '◉', label: 'KEY METRICS',         color: '#00ffaa' },
  terms:           { icon: '📖', label: 'TERMS EXPLAINED',    color: '#ffd93d' },
}

// ── Visual Block Renderer ────────────────────────────────
function VisualBlock({ visual }) {
  const t = visual.type
  if (t === 'takeaways') {
    return <>{(visual.items || []).map((tk, i) => (
      <div key={i} className={`lp-tk-row${tk.highlight ? ' hl' : ''}`}>
        <div className="lp-tk-num">✦</div>
        <div className="lp-tk-text">{tk.text}</div>
      </div>
    ))}</>
  }
  if (t === 'flowchart') {
    if (!visual.mermaid) return <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>No diagram data.</p>
    return (
      <div className="lp-diagram-wrap">
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)', fontSize: 11 }}>Loading diagram...</div>}>
          <MermaidRenderer data={{ mermaidCode: visual.mermaid }} />
        </Suspense>
        {visual.caption && <p className="lp-diagram-cap">{visual.caption}</p>}
      </div>
    )
  }
  if (t === 'eli5') {
    return <>
      <div className="lp-eli5-body">{visual.simple}</div>
      {visual.analogy && <div className="lp-eli5-analogy"><strong style={{ color: '#c77dff', fontStyle: 'normal', fontSize: 9, letterSpacing: 2, fontFamily: "'JetBrains Mono',monospace", display: 'block', marginBottom: 4 }}>ANALOGY</strong>{visual.analogy}</div>}
    </>
  }
  if (t === 'blindspots') {
    return <div className="lp-bs-grid">{(visual.items || []).map((b, i) => (
      <div key={i} className="lp-bs-card">
        <div className="lp-bs-q">? {b.question}</div>
        <div className="lp-bs-note">{b.note}</div>
      </div>
    ))}</div>
  }
  if (t === 'mindmap') {
    const mc = visual.color || '#26de81'
    return (
      <div className="lp-mm-wrap">
        <div className="lp-mm-center" style={{ background: mc + '20', border: `2px solid ${mc}`, color: mc }}>{visual.center}</div>
        <div className="lp-mm-branches">
          {(visual.branches || []).map((b, i) => (
            <div key={i} className="lp-mm-branch" style={{ background: mc + '08', border: `1px solid ${mc}20` }}>
              <div className="lp-mm-blabel" style={{ color: mc }}>{b.label}</div>
              {(b.children || []).map((c, j) => <div key={j} className="lp-mm-child">{typeof c === 'string' ? c : c.label || ''}</div>)}
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (t === 'problemsolution') {
    return <div className="lp-ps-wrap">
      <div className="lp-ps-col lp-ps-prob">
        <div className="lp-ps-label" style={{ color: '#ff5050' }}>PROBLEMS</div>
        {(visual.problems || []).map((p, i) => <div key={i} className="lp-ps-item" style={{ background: 'rgba(255,80,80,0.05)', color: 'var(--text)' }}><span style={{ color: '#ff5050', flexShrink: 0 }}>⚡</span>{p}</div>)}
      </div>
      <div className="lp-ps-arrow">→</div>
      <div className="lp-ps-col lp-ps-sol">
        <div className="lp-ps-label" style={{ color: 'var(--accent)' }}>SOLUTIONS</div>
        {(visual.solutions || []).map((s, i) => <div key={i} className="lp-ps-item" style={{ background: 'rgba(61,214,140,0.05)', color: 'var(--text)' }}><span style={{ color: 'var(--accent)', flexShrink: 0 }}>✓</span>{s}</div>)}
      </div>
    </div>
  }
  if (t === 'proscons') {
    return <>
      {visual.topic && <div className="lp-pc-topic">{visual.topic}</div>}
      <div className="lp-pc-cols">
        <div className="lp-pro-col"><div className="lp-pc-label" style={{ color: 'var(--accent)' }}>✓ PROS</div>{(visual.pros || []).map((p, i) => <div key={i} className="lp-pc-item lp-pro-item">{p}</div>)}</div>
        <div className="lp-con-col"><div className="lp-pc-label" style={{ color: '#ff5050' }}>✗ CONS</div>{(visual.cons || []).map((c, i) => <div key={i} className="lp-pc-item lp-con-item">{c}</div>)}</div>
      </div>
    </>
  }
  if (t === 'comparison') {
    return <div style={{ overflowX: 'auto' }}>
      <table className="lp-cmp-table">
        <thead><tr><th>CRITERIA</th>{(visual.options || []).map((o, i) => <th key={i}>{o}</th>)}</tr></thead>
        <tbody>{(visual.criteria || []).map((r, i) => <tr key={i}><td style={{ color: 'var(--text)', fontWeight: 500 }}>{r.name}</td>{(r.values || []).map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  }
  if (t === 'timeline') {
    return <div className="lp-tl-wrap">{(visual.items || []).map((it, i) => (
      <div key={i} className="lp-tl-item">
        <div className={`lp-tl-dot${it.done ? ' done' : ''}`} />
        <div>
          <div className="lp-tl-time">{it.time}</div>
          <div className="lp-tl-event">{it.event}</div>
          {it.note && <div className="lp-tl-note">{it.note}</div>}
        </div>
      </div>
    ))}</div>
  }
  if (t === 'metrics') {
    return <div className="lp-met-grid">{(visual.items || []).map((m, i) => (
      <div key={i} className="lp-met-card">
        <div className="lp-met-val" style={{ color: m.color || 'var(--accent)' }}>{m.value}</div>
        <div className="lp-met-name">{m.name}</div>
        {m.context && <div className="lp-met-ctx">{m.context}</div>}
      </div>
    ))}</div>
  }
  if (t === 'terms') {
    return <div className="lp-terms-grid">{(visual.items || []).map((tm, i) => (
      <div key={i} className="lp-term-card">
        <div className="lp-term-name">{tm.term}</div>
        <div className="lp-term-def">{tm.definition}</div>
      </div>
    ))}</div>
  }
  return <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>Unknown visual: {t}</p>
}

// ── Main Component ───────────────────────────────────────
export default function LivePage2() {
  // State
  const [anthropicKey] = useState(import.meta.env.ANTHROPIC_API_KEY || '')
  const [deepgramKey] = useState(import.meta.env.VITE_DEEPGRAM_API_KEY || '')
  const [sessionStarted, setSessionStarted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [statusState, setStatusState] = useState('idle')
  const [error, setError] = useState('')
  const [timerText, setTimerText] = useState('')
  const [liveSummary, setLiveSummary] = useState(null)
  const [sections, setSections] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [qaThreads, setQaThreads] = useState([])
  const [qaInput, setQaInput] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [txLines, setTxLines] = useState([])
  const [interimText, setInterimText] = useState('')

  // Refs
  const bufferRef = useRef('')
  const lastAnalyzedRef = useRef(0)
  const lastAnalysisTimeRef = useRef(0)
  const batchNumRef = useRef(0)
  const dgSocketRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const audioProcessorRef = useRef(null)
  const intervalRef = useRef(null)
  const isRecordingRef = useRef(false)
  const txScrollRef = useRef(null)
  const canvasRef = useRef(null)

  // CSS injection
  useEffect(() => {
    const id = 'live2-page-css'
    if (!document.getElementById(id)) {
      const s = document.createElement('style'); s.id = id; s.textContent = LIVE2_CSS; document.head.appendChild(s)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  // Cleanup on unmount
  useEffect(() => () => doStopMic(), [])

  // Auto-scroll transcript
  useEffect(() => {
    if (txScrollRef.current) txScrollRef.current.scrollTop = txScrollRef.current.scrollHeight
  }, [txLines, interimText])

  // ── START MIC ──
  async function doStartMic() {
    if (!anthropicKey.trim()) { setError('VITE_ANTHROPIC_API_KEY not set in environment.'); return }
    if (!deepgramKey.trim()) { setError('VITE_DEEPGRAM_API_KEY not set in environment.'); return }
    setError('')
    setSessionStarted(true)

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      setError('Microphone permission denied. Please allow mic access.'); return
    }
    mediaStreamRef.current = stream

    const dgUrl = 'wss://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=true&interim_results=true&endpointing=300&encoding=linear16&sample_rate=16000&channels=1'
    const ws = new WebSocket(dgUrl, ['token', deepgramKey.trim()])
    dgSocketRef.current = ws

    ws.onopen = () => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const processor = ctx.createScriptProcessor(2048, 1, 1)
      audioProcessorRef.current = processor
      source.connect(processor)
      processor.connect(ctx.destination)

      processor.onaudioprocess = (e) => {
        if (!dgSocketRef.current || dgSocketRef.current.readyState !== WebSocket.OPEN) return
        const input = e.inputBuffer.getChannelData(0)
        const ratio = ctx.sampleRate / 16000
        const outLen = Math.round(input.length / ratio)
        const int16 = new Int16Array(outLen)
        for (let i = 0; i < outLen; i++) {
          const src = input[Math.min(Math.round(i * ratio), input.length - 1)]
          int16[i] = Math.max(-32768, Math.min(32767, src < 0 ? src * 32768 : src * 32767))
        }
        ws.send(int16.buffer)
      }

      isRecordingRef.current = true
      setIsRecording(true)
      setStatusState('listening')
      lastAnalysisTimeRef.current = Date.now()
      intervalRef.current = setInterval(timerTick, 1000)
    }

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data)
        if (data.type === 'Error') { setError('Deepgram: ' + data.description); return }
        const alt = data?.channel?.alternatives?.[0]
        if (!alt) return
        const transcript = alt.transcript || ''
        if (!transcript) return

        if (data.is_final) {
          setInterimText('')
          bufferRef.current += ' ' + transcript
          setTxLines(prev => [...prev, transcript.trim()])
          checkAutoAnalyze()
        } else {
          setInterimText(transcript)
        }
      } catch (e) { console.error('DG parse error', e) }
    }

    ws.onerror = () => {}
    ws.onclose = (e) => {
      if (e.code === 1006) { setError('Deepgram: connection failed. Check your API key.'); isRecordingRef.current = false; setIsRecording(false); setStatusState('idle'); return }
      if (e.code === 1008 || e.code === 4001 || e.code === 4010) { setError('Deepgram: invalid API key.'); isRecordingRef.current = false; setIsRecording(false); setStatusState('idle'); return }
      if (isRecordingRef.current && e.code !== 1000) {
        setError('Deepgram disconnected. Restarting...')
        setTimeout(() => { if (isRecordingRef.current) doStartMic() }, 1500)
      }
    }
  }

  // ── STOP MIC ──
  function doStopMic() {
    isRecordingRef.current = false
    setIsRecording(false)

    if (dgSocketRef.current) {
      if (dgSocketRef.current.readyState === WebSocket.OPEN) dgSocketRef.current.send(JSON.stringify({ type: 'CloseStream' }))
      dgSocketRef.current.close(1000)
      dgSocketRef.current = null
    }
    if (audioProcessorRef.current) { audioProcessorRef.current.disconnect(); audioProcessorRef.current = null }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }

    setStatusState('idle')
    setTimerText('')

    // Final analysis if enough content
    const newContent = bufferRef.current.slice(lastAnalyzedRef.current).trim()
    if (newContent.split(/\s+/).filter(Boolean).length >= 10) doAnalyze()
  }

  // ── TIMER ──
  function timerTick() {
    const elapsed = (Date.now() - lastAnalysisTimeRef.current) / 1000
    const remaining = Math.max(0, Math.round(ANALYSIS_INTERVAL_MS / 1000 - elapsed))
    const newWords = bufferRef.current.slice(lastAnalyzedRef.current).trim().split(/\s+/).filter(Boolean).length

    if (remaining <= 0 && newWords >= MIN_NEW_WORDS) {
      lastAnalysisTimeRef.current = Date.now()
      doAnalyze()
    } else if (newWords >= MIN_NEW_WORDS) {
      setTimerText(`↻ in ${remaining}s`)
    } else {
      setTimerText(newWords > 0 ? `${newWords} words` : '')
    }
  }

  function checkAutoAnalyze() {
    const newWords = bufferRef.current.slice(lastAnalyzedRef.current).trim().split(/\s+/).filter(Boolean).length
    const elapsed = Date.now() - lastAnalysisTimeRef.current
    if (newWords >= MIN_NEW_WORDS && elapsed >= ANALYSIS_INTERVAL_MS) {
      lastAnalysisTimeRef.current = Date.now()
      doAnalyze()
    }
  }

  function analyzeNow() {
    const newContent = bufferRef.current.slice(lastAnalyzedRef.current).trim()
    if (newContent.split(/\s+/).filter(Boolean).length < 5) {
      setError('Not enough new content yet — keep talking!'); return
    }
    lastAnalysisTimeRef.current = Date.now()
    doAnalyze()
  }

  // ── ANALYZE ──
  async function doAnalyze() {
    const key = anthropicKey.trim()
    if (!key) { setError('Anthropic API key is missing.'); return }
    const newContent = bufferRef.current.slice(lastAnalyzedRef.current).trim()
    if (!newContent || newContent.split(/\s+/).filter(Boolean).length < 5) return

    const analyzedUpTo = bufferRef.current.length
    setIsAnalyzing(true)
    setStatusState('analyzing')
    setError('')

    const context = bufferRef.current.length > 2000
      ? `[Earlier context]: ${bufferRef.current.slice(0, bufferRef.current.length - newContent.length).slice(-600).trim()}\n\n[NEW — analyze this]: ${newContent}`
      : `[Full transcript so far]: ${bufferRef.current}`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 2500, system: ANALYSIS_PROMPT,
          messages: [{ role: 'user', content: `Analyze this meeting content:\n\n${context}` }]
        })
      })
      const data = await res.json()
      if (data.error) { setError('API error: ' + data.error.message); setIsAnalyzing(false); setStatusState(isRecordingRef.current ? 'listening' : 'idle'); return }

      const raw = data.content?.[0]?.text || ''
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

      lastAnalyzedRef.current = analyzedUpTo
      batchNumRef.current++

      // Update live summary
      setLiveSummary({
        topic: parsed.currentTopic || '—',
        eli5: parsed.eli5Now || '',
        takeaways: parsed.takeawaysNow || [],
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })

      // Append section
      setSections(prev => [...prev, {
        batch: batchNumRef.current,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        visuals: parsed.visuals || [],
        decisions: parsed.decisions || [],
        actions: parsed.actions || [],
      }])

    } catch (e) {
      setError('Analysis failed: ' + e.message)
    }

    setIsAnalyzing(false)
    setStatusState(isRecordingRef.current ? 'listening' : 'idle')
  }

  // ── ASK Q&A ──
  async function askQuestion(q) {
    const question = q || qaInput.trim()
    if (!question) return
    if (!anthropicKey.trim()) { setError('Enter your Anthropic API key for Q&A.'); return }
    if (!bufferRef.current.trim()) { setError('No transcript yet — start a session first.'); return }

    setQaLoading(true)
    setQaInput('')

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey.trim(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 500,
          system: 'You are a meeting assistant. Answer the question based on this meeting transcript. Be concise and specific.\n\nTranscript:\n' + bufferRef.current,
          messages: [{ role: 'user', content: question }]
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const answer = data.content?.[0]?.text || 'No answer generated.'
      setQaThreads(prev => [...prev, { q: question, a: answer }])
    } catch (e) {
      setError('Q&A failed: ' + e.message)
    }
    setQaLoading(false)
  }

  // ── RENDER ──
  return (
    <div className="lp-page">
      {/* ── SIDEBAR ── */}
      <div className="lp-sidebar">
        <div className="lp-sb-head">
          <div className="lp-sb-logo">
            <div className="lp-sb-logo-dot" />
            <span className="lp-sb-logo-text">Visual Script</span>
            <span className={`lp-live-badge${isRecording ? ' active' : ''}`}>● LIVE</span>
          </div>
        </div>

        {/* Mic controls */}
        <div className="lp-mic-zone">
          <button className={`lp-mic-btn ${isRecording ? 'recording' : 'idle'}`} onClick={() => isRecording ? doStopMic() : doStartMic()}>
            {isRecording ? '🎙 SESSION ACTIVE...' : '🎙 START SESSION'}
          </button>
          <button className={`lp-stop-btn${isRecording ? ' visible' : ''}`} onClick={doStopMic}>■ STOP SESSION</button>
        </div>

        {/* Status */}
        <div className="lp-status">
          <div className={`lp-status-dot ${statusState}`} />
          <span className="lp-status-text">
            {statusState === 'listening' ? 'LISTENING — SPEAK NATURALLY' : statusState === 'analyzing' ? 'ANALYZING TRANSCRIPT...' : 'READY — CLICK TO START'}
          </span>
          <span className="lp-status-timer">{timerText}</span>
        </div>

        {/* Transcript */}
        <div className="lp-tx-zone">
          <div className="lp-sb-label" style={{ marginBottom: 8 }}>Live Transcript</div>
          <div className="lp-tx-scroll" ref={txScrollRef}>
            {txLines.length === 0 && !interimText && (
              <span className="lp-tx-placeholder">Transcript will appear here as you speak...</span>
            )}
            {txLines.map((line, i) => <span key={i} className="lp-tx-final">{line} </span>)}
            {interimText && <span className="lp-tx-interim">{interimText}</span>}
          </div>
        </div>

        {/* Analyze Now */}
        <button className="lp-analyze-btn" onClick={analyzeNow} disabled={!isRecording && txLines.length === 0}>
          ⚡ ANALYZE NOW
        </button>

        {/* Error */}
        {error && <div className="lp-error">{error}</div>}

        {/* Back link */}
        <Link to="/" className="lp-back">← Back to Home</Link>
      </div>

      {/* ── CANVAS ── */}
      <div className="lp-canvas" ref={canvasRef}>
        {/* Live Summary */}
        <div className="lp-live-top">
          {!liveSummary ? (
            <div className="lp-lt-waiting">
              <div className="lp-lt-waiting-icon">🎙</div>
              <p className="lp-lt-waiting-text">START SESSION TO SEE<br/>YOUR VISUAL SCRIPT HERE</p>
            </div>
          ) : (
            <div className="lp-lt-content">
              <div className="lp-lt-topic-row">
                <span className="lp-lt-topic-label">RIGHT NOW</span>
                <div className="lp-lt-topic">{liveSummary.topic}</div>
                <span className="lp-lt-updated">Updated {liveSummary.updatedAt}</span>
              </div>
              <div className="lp-lt-eli5">{liveSummary.eli5}</div>
              <div className="lp-lt-takeaways">
                {liveSummary.takeaways.map((tk, i) => (
                  <span key={i} className={`lp-lt-tk${tk.highlight ? ' hl' : ''}`}>{tk.text}</span>
                ))}
              </div>
              {isAnalyzing && (
                <div className="lp-updating">
                  <div className="lp-upd-spinner" />
                  <span className="lp-upd-text">UPDATING...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Visual Sections */}
        <div className="lp-cv-sections">
          {sections.length === 0 && (
            <div className="lp-empty">
              <p>DETAILED VISUALS WILL APPEAR HERE<br/>AS THE MEETING PROGRESSES</p>
            </div>
          )}

          {sections.map((section, si) => (
            <div key={si}>
              <div className="lp-section-ts">
                <span>UPDATE {section.batch} · {section.timestamp}</span>
              </div>

              {section.visuals.map((visual, vi) => {
                const cfg = VIS_CFG[visual.type] || { icon: '▸', label: visual.type?.toUpperCase() || 'VISUAL', color: '#4a7a9b' }
                return (
                  <div key={vi} className="lp-vs" style={{ animationDelay: `${vi * 0.07}s` }}>
                    <div className="lp-vs-head">
                      <span className="lp-vs-icon">{cfg.icon}</span>
                      <span className="lp-vs-label" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="lp-vs-chip" style={{ background: cfg.color + '15', color: cfg.color, border: `1px solid ${cfg.color}28` }}>{visual.type}</span>
                    </div>
                    <div className="lp-vs-body">
                      <VisualBlock visual={visual} />
                    </div>
                    {visual.explanation && (
                      <div className="lp-vs-explanation">
                        <div className="lp-vs-exp-label">WHAT THIS MEANS</div>
                        {visual.explanation}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Decisions & Actions */}
              {(section.decisions.length > 0 || section.actions.length > 0) && (
                <div className="lp-vs">
                  <div className="lp-vs-head">
                    <span className="lp-vs-icon">⊹</span>
                    <span className="lp-vs-label" style={{ color: '#7b9cff' }}>DECISIONS & ACTIONS</span>
                  </div>
                  <div className="lp-vs-body">
                    <div className="lp-da-grid">
                      {section.decisions.length > 0 && (
                        <div>
                          <div className="lp-sb-label" style={{ marginBottom: 9 }}>DECISIONS</div>
                          {section.decisions.map((d, di) => {
                            const sc = d.status === 'MADE' ? '#00ff88' : d.status === 'PENDING' ? '#ffd93d' : '#7b9cff'
                            return (
                              <div key={di} className="lp-dec-item" style={{ borderLeftColor: sc }}>
                                <span className="lp-dec-status" style={{ color: sc }}>{d.status}</span>
                                <span className="lp-dec-text">{d.text}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {section.actions.length > 0 && (
                        <div>
                          <div className="lp-sb-label" style={{ marginBottom: 9 }}>ACTION ITEMS</div>
                          {section.actions.map((a, ai) => (
                            <div key={ai} className="lp-act-item">
                              <div className="lp-act-cb" />
                              <div>
                                <div className="lp-act-text">{a.text}</div>
                                {a.owner && <div className="lp-act-owner">→ {a.owner}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ask Q&A */}
        <div className="lp-ask" style={!sessionStarted ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
          <div className="lp-ask-head">❓ Ask a Question</div>
          <div className="lp-ask-row">
            <input className="lp-ask-input" placeholder={sessionStarted ? 'Ask about the meeting...' : 'Start a session first...'} value={qaInput} onChange={e => setQaInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !qaLoading && sessionStarted && askQuestion()} disabled={!sessionStarted} />
            <button className="lp-ask-btn" onClick={() => askQuestion()} disabled={qaLoading || !sessionStarted}>{qaLoading ? '...' : 'ASK'}</button>
          </div>
          {qaThreads.length > 0 && (
            <div className="lp-ask-threads">
              {qaThreads.map((t, i) => (
                <div key={i}>
                  <div className="lp-ask-msg"><div className="lp-ask-avatar user">👤</div><div className="lp-ask-text">{t.q}</div></div>
                  <div className="lp-ask-msg" style={{ marginTop: 4 }}><div className="lp-ask-avatar ai">⚡</div><div className="lp-ask-text">{t.a}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
