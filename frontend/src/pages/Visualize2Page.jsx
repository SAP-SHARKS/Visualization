import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { generateCanvas, generateInfographicImage, generateNapkinVisual } from '../services/chartAI'
import { saveCanvasSession, getSession } from '../services/sessionStorage'
import TemplateRenderer from '../components/TemplateRenderer'
import VisualFeedback from '../components/VisualFeedback'
import useTemplates from '../hooks/useTemplates'

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

.v2-header{position:relative;top:0;z-index:10;background:var(--surface);border-bottom:1px solid var(--border);padding:12px 28px;display:flex;align-items:center;gap:14px;flex-shrink:0;}
.v2-save-btn{margin-left:auto;padding:6px 16px;border-radius:9px;font-size:11px;font-weight:600;font-family:'JetBrains Mono',monospace;letter-spacing:1px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;transition:all .25s;white-space:nowrap;}
.v2-save-btn:hover{background:var(--accent);color:#06080c;}
.v2-save-btn.saved{border-color:var(--text-dim);color:var(--text-dim);cursor:default;}
.v2-save-btn.saved:hover{background:transparent;color:var(--text-dim);}
.v2-header::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(61,214,140,0.15),transparent);}
.v2-nav{display:flex;gap:4px;background:rgba(14,17,23,0.8);border-radius:12px;padding:4px;border:1px solid var(--border);overflow:hidden;flex-wrap:wrap;}
.v2-nav::-webkit-scrollbar{height:0;display:none;}
.v2-pill{padding:7px 14px;border-radius:9px;font-size:11px;font-weight:500;color:var(--text-dim);cursor:pointer;transition:all 0.25s;border:none;background:none;font-family:'DM Sans',sans-serif;white-space:nowrap;}
.v2-pill:hover{color:var(--text);background:rgba(255,255,255,0.06);}
.v2-pill.active{background:linear-gradient(135deg,#3dd68c,#2bc47a);color:#06080c;font-weight:600;box-shadow:0 2px 12px rgba(61,214,140,0.3);}

/* Two-column layout like LivePage2 */
.v2-page{display:grid;grid-template-columns:340px 1fr;height:100vh;overflow:hidden;background:var(--bg);}

/* Left sidebar */
.v2-sidebar{background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;}
.v2-sb-head{padding:16px 20px;border-bottom:1px solid var(--border);}
.v2-sb-logo{display:flex;align-items:center;gap:10px;margin-bottom:4px;}
.v2-sb-logo-text{font-family:'DM Serif Display',serif;font-size:16px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.3px;cursor:pointer;}
[data-theme="light"] .v2-sb-logo-text{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;}
.v2-sb-label{font-size:9px;color:var(--text-dim);letter-spacing:2px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;}
.v2-sb-title{font-size:14px;font-weight:600;color:var(--text);margin-top:6px;line-height:1.4;}
.v2-sb-sub{font-size:11px;color:var(--text-dim);margin-top:2px;}

.v2-tx-zone{flex:1;overflow:hidden;display:flex;flex-direction:column;padding:14px 20px;position:relative;}
.v2-tx-label{font-size:9px;color:var(--text-dim);letter-spacing:2px;font-family:'JetBrains Mono',monospace;margin-bottom:10px;text-transform:uppercase;display:flex;align-items:center;gap:8px;}
.v2-tx-label::before{content:'📝';font-size:12px;}
.v2-tx-scroll{flex:1;overflow-y:auto;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.8;color:var(--text-dim);white-space:pre-wrap;word-break:break-word;}
.v2-tx-scroll::-webkit-scrollbar{width:4px;}
.v2-tx-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}
.v2-sel-btn{position:absolute;z-index:20;width:28px;height:28px;border-radius:50%;background:var(--accent);color:#06080c;border:none;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(61,214,140,0.4);transition:transform .15s;animation:v2FadeUp .2s ease;}
.v2-sel-btn:hover{transform:scale(1.15);}
.v2-tx-highlight{background:rgba(61,214,140,0.15);border-left:2px solid var(--accent);padding:2px 4px;border-radius:4px;color:#fff;}
[data-theme="light"] .v2-tx-highlight{background:rgba(99,102,241,0.1);border-left-color:#6366f1;}
.v2-sb-back{font-size:11px;color:var(--text-dim);text-decoration:none;padding:8px 20px;border-top:1px solid var(--border);font-family:'JetBrains Mono',monospace;letter-spacing:1px;text-transform:uppercase;flex-shrink:0;transition:color .2s;cursor:pointer;background:none;border-left:none;border-right:none;border-bottom:none;}
.v2-sb-back:hover{color:var(--accent);}

/* Right canvas */
.v2-canvas{overflow-y:auto;display:flex;flex-direction:column;background:var(--bg);}
.v2-canvas::-webkit-scrollbar{width:5px;}
.v2-canvas::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}

.v2-content{padding:20px 28px;padding-bottom:80px;}

.v2-hero{padding:24px 0 20px;}
.v2-hero-label{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;}
.v2-hero-title{font-family:'DM Serif Display',serif;font-size:28px;letter-spacing:-0.5px;margin-bottom:4px;background:linear-gradient(135deg,#e8eaf0 30%,#8a90a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.v2-hero-sub{color:var(--text-dim);font-size:14px;}

.v2-section{margin-bottom:48px;animation:v2FadeUp .6s ease forwards;opacity:0;}
@keyframes v2FadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
.v2-section-head{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
.v2-section-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.v2-section-label{font-family:'JetBrains Mono',monospace;font-size:15px;text-transform:uppercase;letter-spacing:2px;color:var(--accent);}
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
.v2-mindmap-wrap{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:0;min-height:300px;overflow:hidden;}

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
[data-theme="light"] .v2-header{background:#fff;border-bottom-color:rgba(99,102,241,0.08);}
[data-theme="light"] .v2-header::after{background:linear-gradient(90deg,transparent,rgba(99,102,241,0.15),transparent);}
[data-theme="light"] .v2-nav{background:rgba(99,102,241,0.04);border-color:rgba(99,102,241,0.08);}
[data-theme="light"] .v2-pill:hover{background:rgba(99,102,241,0.06);}
[data-theme="light"] .v2-pill.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;}
[data-theme="light"] .v2-sb-logo-text{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;}
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
[data-theme="light"] .v2-sidebar{background:#fff;}
[data-theme="light"] .v2-tx-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);}

/* Ask Q&A */
.v2-ask{padding:32px;background:var(--surface);border:1px solid var(--border);border-radius:20px;animation:v2FadeUp .6s ease forwards;opacity:0;}
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

/* Transcript speaker diarization */
.v2-tx-block{margin-bottom:10px;}
.v2-tx-speaker{display:block;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;}
.v2-tx-speaker.s0{color:#3dd68c;} .v2-tx-speaker.s1{color:#5b9cf5;} .v2-tx-speaker.s2{color:#f59e0b;} .v2-tx-speaker.s3{color:#c77dff;} .v2-tx-speaker.s4{color:#f472b6;} .v2-tx-speaker.s5{color:#fb7185;}
.v2-tx-text{color:var(--text);display:inline;}

/* Cause-Effect chain override — vertical layout, no scrollbar */
.tmpl-ce{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:0!important;padding:8px 0!important;overflow-x:visible!important;overflow:visible!important;}
.tmpl-ce-n{padding:14px 18px!important;border-radius:12px!important;display:flex!important;align-items:center!important;gap:12px!important;flex-shrink:1!important;min-width:0!important;margin-right:0!important;position:relative!important;}
.tmpl-ce-n:not(:last-child){margin-bottom:28px!important;}
.tmpl-ce-n:not(:last-child)::after{content:'↓'!important;position:absolute!important;bottom:-22px!important;left:50%!important;right:auto!important;top:auto!important;transform:translateX(-50%)!important;color:var(--text-dim)!important;font-size:16px!important;opacity:0.6!important;}
.tmpl-ce-tag{min-width:48px!important;flex-shrink:0!important;font-size:9px!important;}
.tmpl-ce-lbl{font-size:13px!important;line-height:1.5!important;word-break:break-word!important;}

/* Infographic Image (Gemini) */
.v2-infographic-wrap{border-radius:16px;overflow:hidden;border:1px solid var(--border);background:var(--surface);max-width:540px;margin:0 auto;cursor:pointer;transition:transform .2s,box-shadow .2s;}
.v2-infographic-wrap:hover{transform:scale(1.01);box-shadow:0 8px 32px rgba(0,0,0,0.2);}
.v2-infographic-wrap img{width:100%;height:auto;display:block;object-fit:contain;}
.v2-infographic-loading{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:60px 20px;text-align:center;max-width:540px;margin:0 auto;}
.v2-infographic-loading-text{color:var(--text-dim);font-size:14px;margin-top:12px;}

/* Lightbox */
.v2-lightbox{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:v2LbIn .25s ease;}
@keyframes v2LbIn{from{opacity:0;}to{opacity:1;}}
.v2-lightbox-close{position:absolute;top:16px;right:20px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;z-index:2;}
.v2-lightbox-close:hover{background:rgba(255,255,255,0.2);}
.v2-lightbox-controls{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:2;}
.v2-lightbox-btn{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:8px 16px;border-radius:10px;font-size:13px;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:background .2s;user-select:none;}
.v2-lightbox-btn:hover{background:rgba(255,255,255,0.2);}
.v2-lightbox-btn.active{background:rgba(61,214,140,0.2);border-color:rgba(61,214,140,0.4);color:#3dd68c;}
.v2-lightbox-img-wrap{overflow:hidden;max-width:90vw;max-height:85vh;border-radius:12px;cursor:grab;touch-action:none;}
.v2-lightbox-img-wrap:active{cursor:grabbing;}
.v2-lightbox-img-wrap img{display:block;transform-origin:center center;transition:transform .15s ease;user-select:none;-webkit-user-drag:none;}

/* Napkin Toggle */
.v2-napkin-toggle{display:flex;gap:2px;background:rgba(14,17,23,0.6);border-radius:8px;padding:2px;border:1px solid var(--border);margin-left:auto;}
.v2-toggle-btn{padding:4px 12px;border-radius:6px;font-size:10px;font-weight:600;color:var(--text-dim);cursor:pointer;transition:all 0.2s;border:none;background:none;font-family:'JetBrains Mono',monospace;letter-spacing:0.5px;text-transform:uppercase;}
.v2-toggle-btn:hover{color:var(--text);}
.v2-toggle-btn.active{background:var(--accent);color:#06080c;box-shadow:0 1px 6px rgba(61,214,140,0.3);}
[data-theme="light"] .v2-napkin-toggle{background:rgba(99,102,241,0.04);}
[data-theme="light"] .v2-toggle-btn.active{background:#6366f1;color:#fff;}
/* Napkin View */
.v2-napkin-view{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;}
.v2-napkin-img-wrap{position:relative;height:450px;overflow:hidden;cursor:grab;user-select:none;background:var(--bg);}
.v2-napkin-img-wrap.grabbing{cursor:grabbing;}
.v2-napkin-img-wrap img{position:absolute;top:0;left:0;transform-origin:0 0;pointer-events:none;border-radius:8px;max-width:none;}
.v2-napkin-toolbar{display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 12px;border-top:1px solid var(--border);background:var(--surface);}
.v2-napkin-zoom-btn{width:30px;height:30px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;font-weight:700;}
.v2-napkin-zoom-btn:hover{border-color:var(--accent);color:var(--accent);}
.v2-napkin-zoom-label{font-size:10px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;min-width:40px;text-align:center;}
.v2-napkin-nav{display:flex;align-items:center;justify-content:center;gap:16px;padding:12px;border-top:1px solid var(--border);}
.v2-napkin-nav-btn{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}
.v2-napkin-nav-btn:hover{border-color:var(--accent);color:var(--accent);}
.v2-napkin-nav-label{font-size:11px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;letter-spacing:0.5px;}
.v2-napkin-loading{text-align:center;padding:60px 20px;background:var(--surface);border:1px solid var(--border);border-radius:16px;}
.v2-napkin-error{background:rgba(255,80,80,0.08);border:1px solid rgba(255,80,80,0.2);color:#ff5050;padding:16px 24px;border-radius:14px;font-size:13px;text-align:center;}
.v2-napkin-select-btn{margin-left:auto;padding:4px 14px;border-radius:6px;font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;letter-spacing:0.5px;text-transform:uppercase;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;transition:all 0.2s;}
.v2-napkin-select-btn:hover{border-color:var(--accent);color:var(--accent);}
.v2-napkin-select-btn.selected{background:var(--accent);color:#06080c;border-color:var(--accent);}
[data-theme="light"] .v2-napkin-select-btn.selected{background:#6366f1;color:#fff;border-color:#6366f1;}

@media(max-width:800px){
  .v2-page{grid-template-columns:1fr;height:auto;}
  .v2-sidebar{max-height:40vh;border-right:none;border-bottom:1px solid var(--border);}
  .v2-header{padding:10px 16px;flex-wrap:wrap;}
  .v2-nav{flex-wrap:nowrap;overflow-x:auto;width:100%;}
  .v2-ps-grid,.v2-pc-grid{grid-template-columns:1fr;}
  .v2-metrics-grid{grid-template-columns:1fr 1fr;}
  .v2-content{padding-left:16px;padding-right:16px;}
  .v2-hero-title{font-size:22px;}
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
  ask: { icon: '❓', label: 'Ask' },
}

// Parse transcript text into speaker blocks
function parseTranscriptSpeakers(text) {
  if (!text) return []
  const lines = text.split('\n')
  const blocks = []
  // Match patterns: "Speaker 1:", "Speaker A:", "Name:", "SPEAKER 1:", etc.
  const speakerRegex = /^(Speaker\s*\d+|[A-Z][a-zA-Z0-9 ]{0,20})\s*:\s*/i
  const speakerMap = {}
  let nextIdx = 0

  for (const line of lines) {
    const match = line.match(speakerRegex)
    if (match) {
      const name = match[1].trim()
      if (!(name in speakerMap)) {
        speakerMap[name] = nextIdx++
      }
      const text = line.slice(match[0].length).trim()
      if (text) blocks.push({ speaker: speakerMap[name], name, text })
    } else if (line.trim()) {
      // Continue previous speaker's block or add as plain text
      if (blocks.length > 0 && blocks[blocks.length - 1].speaker != null) {
        blocks[blocks.length - 1].text += ' ' + line.trim()
      } else {
        blocks.push({ speaker: null, name: null, text: line.trim() })
      }
    }
  }
  return blocks
}

// ── Napkin View ──────────────────────────────────────────
function NapkinView({ napkin, variationIdx, selectedIdx, onPrev, onNext, onRetry, onSelect, isHistoryMode }) {
  const wrapRef = useRef(null)
  const imgRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  // Reset zoom/pan when variation changes
  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [variationIdx])

  // Fit image to container on load
  const handleImgLoad = () => {
    const img = imgRef.current
    const wrap = wrapRef.current
    if (!img || !wrap) return
    const scaleX = wrap.clientWidth / img.naturalWidth
    const scaleY = wrap.clientHeight / img.naturalHeight
    const fit = Math.min(scaleX, scaleY, 1)
    setZoom(fit)
    setPan({
      x: (wrap.clientWidth - img.naturalWidth * fit) / 2,
      y: (wrap.clientHeight - img.naturalHeight * fit) / 2
    })
  }

  const changeZoom = (delta) => {
    setZoom(prev => {
      const next = Math.min(Math.max(prev + delta, 0.1), 5)
      // Adjust pan to zoom toward center
      const wrap = wrapRef.current
      if (wrap) {
        const cx = wrap.clientWidth / 2
        const cy = wrap.clientHeight / 2
        setPan(p => ({
          x: cx - (cx - p.x) * (next / prev),
          y: cy - (cy - p.y) * (next / prev)
        }))
      }
      return next
    })
  }

  const resetView = () => handleImgLoad()

  // Mouse wheel zoom
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const onWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(prev => {
        const next = Math.min(Math.max(prev + delta, 0.1), 5)
        const rect = wrap.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        setPan(p => ({
          x: mx - (mx - p.x) * (next / prev),
          y: my - (my - p.y) * (next / prev)
        }))
        return next
      })
    }
    wrap.addEventListener('wheel', onWheel, { passive: false })
    return () => wrap.removeEventListener('wheel', onWheel)
  }, [])

  // Drag handlers
  const onMouseDown = (e) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }
  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      setPan({
        x: dragStart.current.panX + (e.clientX - dragStart.current.x),
        y: dragStart.current.panY + (e.clientY - dragStart.current.y)
      })
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging])

  if (!napkin || napkin.loading) {
    return (
      <div className="v2-napkin-loading">
        <div className="v2-spinner" />
        <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 12 }}>Generating Napkin visual...</div>
      </div>
    )
  }
  if (napkin.error) {
    return (
      <div className="v2-napkin-error">
        Napkin generation failed: {napkin.error}
        <br /><button onClick={onRetry} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6, border: '1px solid #ff5050', background: 'transparent', color: '#ff5050', cursor: 'pointer', fontSize: 12 }}>Retry</button>
      </div>
    )
  }
  if (!napkin.images || napkin.images.length === 0) {
    return <div className="v2-napkin-error">No visuals generated.</div>
  }
  const img = napkin.images[variationIdx] || napkin.images[0]
  const total = napkin.images.length
  const isSelected = selectedIdx === variationIdx
  return (
    <div className="v2-napkin-view">
      <div
        className={`v2-napkin-img-wrap${dragging ? ' grabbing' : ''}`}
        ref={wrapRef}
        onMouseDown={onMouseDown}
      >
        <img
          ref={imgRef}
          src={img}
          alt={`Napkin variation ${variationIdx + 1}`}
          onLoad={handleImgLoad}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          draggable={false}
        />
      </div>
      <div className="v2-napkin-toolbar">
        <button className="v2-napkin-zoom-btn" onClick={() => changeZoom(-0.15)} title="Zoom out">−</button>
        <span className="v2-napkin-zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="v2-napkin-zoom-btn" onClick={() => changeZoom(0.15)} title="Zoom in">+</button>
        <button className="v2-napkin-zoom-btn" onClick={resetView} title="Fit to window" style={{ fontSize: 12, width: 'auto', padding: '0 8px' }}>Fit</button>
      </div>
      <div className="v2-napkin-nav">
        {total > 1 && <button onClick={onPrev} className="v2-napkin-nav-btn">&larr;</button>}
        {total > 1 && <span className="v2-napkin-nav-label">Variation {variationIdx + 1} of {total}</span>}
        {total > 1 && <button onClick={onNext} className="v2-napkin-nav-btn">&rarr;</button>}
        {!isHistoryMode && total > 1 && (
          <button className={`v2-napkin-select-btn${isSelected ? ' selected' : ''}`} onClick={() => onSelect(variationIdx)}>
            {isSelected ? '✓ Selected' : 'Select'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Pipeline Log Panel ───────────────────────────────────
function VisualRenderer({ visual, getTemplate }) {
  // Template-based rendering (new system)
  if (visual.template_slug) {
    const tmpl = getTemplate(visual.template_slug)
    if (tmpl) return <TemplateRenderer template={tmpl} schemaData={visual.schema_data || visual} />
  }
  // Legacy rendering (backward-compatible)
  return <LegacyVisualRenderer visual={visual} />
}

function LegacyVisualRenderer({ visual }) {
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
    const root = visual.root || {
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

// ── Console logger for pipeline data ─────────────────────
const STEP_CONSOLE_COLORS = {
  FETCH_TEMPLATES: '#5b9cf5', PRE_FILTER: '#f59e0b', SPLIT: '#a78bfa', LLM_SELECT: '#8b5cf6',
  LLM_RETRY: '#f59e0b', LLM_RESULT: '#3dd68c', LLM_PARSE: '#ef4444',
  CONFIDENCE_GATE: '#f59e0b', DEDUP: '#06b6d4', COMPLETE: '#3dd68c',
  ERROR: '#ef4444', FALLBACK: '#f59e0b', LEGACY_MODE: '#6b7280',
}
const STEP_CONSOLE_ICONS = {
  FETCH_TEMPLATES: '📦', PRE_FILTER: '🔍', SPLIT: '✂️', LLM_SELECT: '🤖', LLM_RETRY: '🔄',
  LLM_RESULT: '📋', LLM_PARSE: '⚠️', CONFIDENCE_GATE: '🚦', DEDUP: '🧹',
  COMPLETE: '✅', ERROR: '❌', FALLBACK: '↩️', LEGACY_MODE: '📜',
}

function logPipelineToConsole(pipeline) {
  if (!pipeline) return
  const { mode, log = [], candidateCount, selectedCount, timeMs } = pipeline

  console.group(
    `%c[VisualScript Pipeline] %c${(mode || 'unknown').toUpperCase()} %c${timeMs != null ? timeMs + 'ms' : ''}`,
    'color:#8b5cf6;font-weight:bold',
    `color:#fff;background:${mode === 'template' ? '#8b5cf6' : '#6b7280'};padding:1px 6px;border-radius:3px;font-weight:bold`,
    'color:#6b7280'
  )

  if (candidateCount != null || selectedCount != null) {
    console.log(
      `%cSummary: %c${candidateCount ?? '?'} candidates → ${selectedCount ?? '?'} selected`,
      'color:#6b7280', 'color:#3dd68c;font-weight:bold'
    )
  }

  for (const entry of log) {
    const color = STEP_CONSOLE_COLORS[entry.step] || '#6b7280'
    const icon = STEP_CONSOLE_ICONS[entry.step] || '●'
    console.groupCollapsed(
      `%c${icon} ${entry.step} %c+${entry.ts}ms`,
      `color:${color};font-weight:bold`,
      'color:#6b7280;font-weight:normal'
    )
    if (entry.detail) console.log(entry.detail)
    console.groupEnd()
  }

  console.groupEnd()
}

export default function Visualize2Page() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const state = location.state
  const { getTemplate } = useTemplates()
  const historySessionId = searchParams.get('session')

  useEffect(() => {
    if (!state?.content && !historySessionId) navigate('/', { replace: true })
  }, [state, historySessionId, navigate])

  const [content, setContent] = useState(state?.content || '')
  const [title, setTitle] = useState('Analyzing...')
  const [subtitle, setSubtitle] = useState('')
  const [visuals, setVisuals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pipelineData, setPipelineData] = useState(null)
  const [activeNav, setActiveNav] = useState(null)
  const [sessionSaved, setSessionSaved] = useState(false)
  const [isHistoryMode, setIsHistoryMode] = useState(!!historySessionId)
  const [qaInput, setQaInput] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [qaThreads, setQaThreads] = useState([])
  const [selectedText, setSelectedText] = useState('')
  const [selBtnPos, setSelBtnPos] = useState(null)
  const [analyzedText, setAnalyzedText] = useState('')
  const [infographicImage, setInfographicImage] = useState(null)
  const [infographicLoading, setInfographicLoading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxZoom, setLightboxZoom] = useState(1)
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 })
  // Napkin.ai integration
  const [napkinResults, setNapkinResults] = useState({})
  const [viewMode, setViewMode] = useState({})
  const [napkinVariation, setNapkinVariation] = useState({})
  const [napkinSelected, setNapkinSelected] = useState({})
  const lightboxDrag = useRef(null)
  const txZoneRef = useRef(null)
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

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = e => { if (e.key === 'Escape') setLightboxOpen(false) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [lightboxOpen])

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
      if (canvas.infographic_image_url) {
        setInfographicImage(canvas.infographic_image_url)
      }
      // Restore saved napkin images
      if (canvas.napkin_images && typeof canvas.napkin_images === 'object') {
        const restored = {}
        for (const [idx, url] of Object.entries(canvas.napkin_images)) {
          restored[idx] = { images: [url], loading: false, error: null }
        }
        setNapkinResults(restored)
      }
      setSessionSaved(true)
      setIsHistoryMode(true)
      setLoading(false)
    })
  }, [historySessionId])

  // Manual save handler
  const handleSaveCanvas = async () => {
    if (sessionSaved || loading || visuals.length === 0) return
    setSessionSaved(true)

    // Build napkin images map: { [idx]: selectedBase64DataUrl }
    const napkinImages = {}
    for (const [idx, result] of Object.entries(napkinResults)) {
      if (!result || !result.images || result.images.length === 0) continue
      const selectedIdx = napkinSelected[idx] != null ? napkinSelected[idx] : 0
      napkinImages[idx] = result.images[selectedIdx] || result.images[0]
    }

    const { sessionId, error: err } = await saveCanvasSession({
      title,
      subtitle,
      transcript: analyzedText || content,
      visuals,
      infographicImage,
      napkinImages,
    })
    if (err) {
      console.error('Canvas save failed:', err)
      setSessionSaved(false)
    } else {
      console.log('Canvas session saved:', sessionId)
    }
  }

  // Napkin.ai handlers
  const fetchNapkinVisual = async (idx, visual) => {
    const slug = visual.template_slug || visual.type
    const schemaData = visual.schema_data || visual
    setNapkinResults(prev => ({ ...prev, [idx]: { images: [], loading: true, error: null } }))
    const { images, error: napErr } = await generateNapkinVisual(slug, schemaData, title, visual.explanation)
    setNapkinResults(prev => ({ ...prev, [idx]: { images: images || [], loading: false, error: napErr || null } }))
    // Auto-select first variation by default
    if (images && images.length > 0) {
      setNapkinSelected(prev => prev[idx] != null ? prev : { ...prev, [idx]: 0 })
    }
  }

  const toggleViewMode = (idx) => {
    setViewMode(prev => {
      const current = prev[idx] || 'canvas'
      return { ...prev, [idx]: current === 'canvas' ? 'napkin' : 'canvas' }
    })
  }

  const cycleNapkinVariation = (idx, direction) => {
    setNapkinVariation(prev => {
      const current = prev[idx] || 0
      const images = napkinResults[idx]?.images || []
      if (images.length <= 1) return prev
      const next = direction === 'next' ? (current + 1) % images.length : (current - 1 + images.length) % images.length
      return { ...prev, [idx]: next }
    })
  }

  const selectNapkinVariation = (idx, varIdx) => {
    setNapkinSelected(prev => ({ ...prev, [idx]: varIdx }))
  }

  // Auto-trigger Napkin generation for all visuals after canvas loads
  useEffect(() => {
    if (visuals.length === 0 || isHistoryMode || loading) return
    visuals.forEach((visual, idx) => {
      if (!napkinResults[idx]) fetchNapkinVisual(idx, visual)
    })
  }, [visuals.length])

  // Generate canvas
  useEffect(() => {
    if (!content || visuals.length > 0 || loading || isHistoryMode) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const t0 = performance.now()
    console.log('%c[VisualScript] Starting canvas generation...', 'color:#8b5cf6;font-weight:bold')

    generateCanvas(content).then(({ title: t, subtitle: s, visuals: v, error: err, _pipeline: p, infographic_data: ig }) => {
      if (cancelled) return
      const elapsed = Math.round(performance.now() - t0)
      console.log(`%c[VisualScript] Roundtrip: ${elapsed}ms`, 'color:#8b5cf6')
      if (p) { setPipelineData(p); logPipelineToConsole(p) }
      else { console.warn('[VisualScript] No pipeline data — API running in legacy mode (Supabase env vars missing or no templates seeded)') }
      if (err) { console.error('[VisualScript] Error:', err); setError(err); setLoading(false); return }
      console.log(`%c[VisualScript] Received ${(v || []).length} visuals`, 'color:#3dd68c')
      if (t) setTitle(t)
      if (s) setSubtitle(s)
      setVisuals(v || [])
      setLoading(false)

      // Trigger Gemini Imagen infographic generation in parallel
      if (ig && (ig.steps?.length > 0 || ig.stats?.length > 0)) {
        console.log('%c[Gemini Imagen] Starting infographic image generation...', 'color:#f59e0b;font-weight:bold')
        console.log('%c[Gemini Imagen] Infographic data:', 'color:#f59e0b', { title: ig.title, steps: ig.steps?.length || 0, stats: ig.stats?.length || 0 })
        const geminiT0 = performance.now()
        setInfographicLoading(true)
        generateInfographicImage(ig).then(({ imageUrl, error: imgErr }) => {
          if (cancelled) return
          const geminiElapsed = Math.round(performance.now() - geminiT0)
          if (imgErr) {
            console.error(`%c[Gemini Imagen] Failed after ${geminiElapsed}ms:`, 'color:#ff5050;font-weight:bold', imgErr)
          } else if (imageUrl) {
            console.log(`%c[Gemini Imagen] Image received in ${geminiElapsed}ms`, 'color:#3dd68c;font-weight:bold')
            setInfographicImage(imageUrl)
          }
          setInfographicLoading(false)
        })
      } else {
        console.log('%c[Gemini Imagen] Skipped — no steps or stats in Claude response', 'color:#6b7280')
      }
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

  const handleTextSelect = () => {
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (!text || !txZoneRef.current) { setSelBtnPos(null); setSelectedText(''); return }
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const zone = txZoneRef.current.getBoundingClientRect()
    setSelectedText(text)
    setSelBtnPos({ top: rect.top - zone.top - 32, left: Math.min(rect.left - zone.left + rect.width / 2 - 14, zone.width - 36) })
  }

  const handleAnalyzeSelection = () => {
    if (!selectedText) return
    const textToAnalyze = selectedText
    setAnalyzedText(textToAnalyze)
    setLoading(true)
    setError(null)
    setVisuals([])
    setDecisions([])
    setActions([])
    setSelBtnPos(null)
    setSelectedText('')
    window.getSelection()?.removeAllRanges()

    const t0sel = performance.now()
    console.log('%c[VisualScript] Starting canvas generation (selection)...', 'color:#8b5cf6;font-weight:bold')

    generateCanvas(textToAnalyze).then(({ title: t, subtitle: s, visuals: v, error: err, _pipeline: p, infographic_data: ig }) => {
      const elapsed = Math.round(performance.now() - t0sel)
      console.log(`%c[VisualScript] Roundtrip (selection): ${elapsed}ms`, 'color:#8b5cf6')
      if (p) { setPipelineData(p); logPipelineToConsole(p) }
      else { console.warn('[VisualScript] No pipeline data — API running in legacy mode (Supabase env vars missing or no templates seeded)') }
      if (err) { console.error('[VisualScript] Error:', err); setError(err); setLoading(false); return }
      console.log(`%c[VisualScript] Received ${(v || []).length} visuals`, 'color:#3dd68c')
      if (t) setTitle(t)
      if (s) setSubtitle(s)
      setVisuals(v || [])
      setLoading(false)
      setSessionSaved(false)

      // Trigger Gemini Imagen infographic generation in parallel
      if (ig && (ig.steps?.length > 0 || ig.stats?.length > 0)) {
        console.log('%c[Gemini Imagen] Starting infographic image generation (selection)...', 'color:#f59e0b;font-weight:bold')
        console.log('%c[Gemini Imagen] Infographic data:', 'color:#f59e0b', { title: ig.title, steps: ig.steps?.length || 0, stats: ig.stats?.length || 0 })
        const geminiT0 = performance.now()
        setInfographicLoading(true)
        setInfographicImage(null)
        generateInfographicImage(ig).then(({ imageUrl, error: imgErr }) => {
          const geminiElapsed = Math.round(performance.now() - geminiT0)
          if (imgErr) {
            console.error(`%c[Gemini Imagen] Failed after ${geminiElapsed}ms:`, 'color:#ff5050;font-weight:bold', imgErr)
          } else if (imageUrl) {
            console.log(`%c[Gemini Imagen] Image received in ${geminiElapsed}ms`, 'color:#3dd68c;font-weight:bold')
            setInfographicImage(imageUrl)
          }
          setInfographicLoading(false)
        })
      } else {
        console.log('%c[Gemini Imagen] Skipped — no steps or stats in Claude response', 'color:#6b7280')
      }
    })
  }

  if (!state?.content && !historySessionId) return null

  const txBlocks = parseTranscriptSpeakers(content)
  const hasSpeakers = txBlocks.some(b => b.speaker != null)

  // Highlight analyzed text within a string
  const highlightText = (text) => {
    if (!analyzedText || !text.includes(analyzedText)) return text
    const idx = text.indexOf(analyzedText)
    return <>
      {text.slice(0, idx)}
      <mark className="v2-tx-highlight">{analyzedText}</mark>
      {text.slice(idx + analyzedText.length)}
    </>
  }

  // Build nav dynamically from ALL visuals (template-based or legacy)
  const navItems = visuals.map(v => {
    const slug = v.template_slug || v.type
    const tmpl = v.template_slug ? getTemplate(v.template_slug) : null
    const meta = SECTION_META[v.type] || SECTION_META[slug]
    const label = meta?.label || (tmpl ? tmpl.name : slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    return { key: slug, label }
  })
  if (infographicImage || infographicLoading) navItems.push({ key: 'infographic-image', label: 'Infographic' })
  navItems.push({ key: 'ask', label: 'Ask' })

  return (
    <div className="v2-page">
      {/* Left Sidebar - Transcript */}
      <aside className="v2-sidebar">
        <div className="v2-sb-head">
          <div className="v2-sb-logo">
            <div className="v2-sb-logo-text" onClick={() => navigate('/')}>VisualScript</div>
          </div>
          <div className="v2-sb-label">Canvas View</div>
        </div>
        <div className="v2-tx-zone" ref={txZoneRef}>
          <div className="v2-tx-label">Full Transcript</div>
          {selBtnPos && (
            <button className="v2-sel-btn" style={{ top: selBtnPos.top, left: selBtnPos.left }} onClick={handleAnalyzeSelection} title="Analyze selected text">
              ✦
            </button>
          )}
          <div className="v2-tx-scroll" onMouseUp={handleTextSelect} onScroll={() => { setSelBtnPos(null); setSelectedText('') }}>
            {!content ? 'No transcript loaded.' : hasSpeakers ? (
              txBlocks.map((block, i) => (
                <div key={i} className="v2-tx-block">
                  {block.speaker != null && <span className={`v2-tx-speaker s${block.speaker % 6}`}>{block.name}</span>}
                  <span className="v2-tx-text">{highlightText(block.text)}</span>
                </div>
              ))
            ) : (
              <span style={{color:'var(--text-dim)'}}>{highlightText(content)}</span>
            )}
          </div>
        </div>
        <button className="v2-sb-back" onClick={() => navigate('/')}>← Back to Home</button>
      </aside>

      {/* Right Canvas */}
      <main className="v2-canvas">
        {!loading && visuals.length > 0 && (
          <header className="v2-header">
            <nav className="v2-nav">
              {navItems.map(item => (
                <button key={item.key} className={`v2-pill${activeNav === `v2-${item.key}` ? ' active' : ''}`} onClick={() => scrollTo(`v2-${item.key}`)}>
                  {item.label}
                </button>
              ))}
            </nav>
            <button className={`v2-save-btn${sessionSaved ? ' saved' : ''}`} onClick={handleSaveCanvas} disabled={sessionSaved}>
              {sessionSaved ? '✓ SAVED' : 'SAVE'}
            </button>
          </header>
        )}

        <div className="v2-content">
          {loading && (
            <div className="v2-loading">
              <div className="v2-spinner" />
              <div className="v2-loading-text">Analyzing transcript and building canvas...</div>
            </div>
          )}

          {error && <div className="v2-error">{error}</div>}

          {/* Title & Subtitle */}
          {!loading && visuals.length > 0 && (
            <div className="v2-hero">
              <div className="v2-hero-label">CANVAS VIEW</div>
              <h1 className="v2-hero-title">{title}</h1>
              {subtitle && <p className="v2-hero-sub">{subtitle}</p>}
            </div>
          )}

          {/* All visual sections */}
          {visuals.map((visual, idx) => {
          const slug = visual.template_slug || visual.type
          const tmpl = visual.template_slug ? getTemplate(visual.template_slug) : null
          const meta = SECTION_META[visual.type] || (tmpl ? { icon: '📌', label: tmpl.name } : { icon: '📌', label: visual.type })
          const mode = viewMode[idx] || 'canvas'
          const napkin = napkinResults[idx]
          const varIdx = napkinVariation[idx] || 0
          return (
            <div key={idx} className="v2-section" id={`v2-${slug}`} ref={el => sectionRefs.current[`v2-${slug}`] = el} style={{animationDelay: `${idx * 0.1}s`}}>
              <div className="v2-section-head">
                <div className="v2-section-icon" style={{background:'var(--accent-glow)',border:'1px solid var(--border)'}}>{meta.icon}</div>
                <div>
                  <div className="v2-section-label">{meta.label}</div>
                </div>
                {(!isHistoryMode || napkinResults[idx]) && (
                <div className="v2-napkin-toggle">
                  <button className={`v2-toggle-btn${mode === 'canvas' ? ' active' : ''}`} onClick={() => setViewMode(prev => ({ ...prev, [idx]: 'canvas' }))}>Canvas</button>
                  <button className={`v2-toggle-btn${mode === 'napkin' ? ' active' : ''}`} onClick={() => toggleViewMode(idx)}>Napkin</button>
                </div>
                )}
              </div>
              {mode === 'canvas' ? (
                <VisualRenderer visual={visual} getTemplate={getTemplate} />
              ) : (
                <NapkinView napkin={napkin} variationIdx={varIdx} selectedIdx={napkinSelected[idx]} onPrev={() => cycleNapkinVariation(idx, 'prev')} onNext={() => cycleNapkinVariation(idx, 'next')} onRetry={() => fetchNapkinVisual(idx, visual)} onSelect={(vIdx) => selectNapkinVariation(idx, vIdx)} isHistoryMode={isHistoryMode} />
              )}
              {visual.explanation && <div className="v2-explanation">{visual.explanation}</div>}
              {visual.template_id && !['eli5', 'takeaways', 'blindspots'].includes(visual.template_slug) && <VisualFeedback templateId={visual.template_id} sessionId={historySessionId} visualData={visual.schema_data} />}
            </div>
          )
        })}

        {/* Infographic Image (Gemini Imagen) */}
        {!loading && (infographicImage || infographicLoading) && (
          <div className="v2-section" id="v2-infographic-image" ref={el => sectionRefs.current['v2-infographic-image'] = el} style={{ animationDelay: `${visuals.length * 0.1 + 0.1}s` }}>
            <div className="v2-section-head">
              <div className="v2-section-icon" style={{ background: 'var(--accent-glow)', border: '1px solid var(--border)' }}>🎨</div>
              <div>
                <div className="v2-section-label">Infographic</div>
              </div>
            </div>
            {infographicLoading ? (
              <div className="v2-infographic-loading">
                <div className="v2-spinner" />
                <div className="v2-infographic-loading-text">Generating infographic image via Gemini...</div>
              </div>
            ) : infographicImage ? (
              <div className="v2-infographic-wrap" onClick={() => { setLightboxOpen(true); setLightboxZoom(1); setLightboxPan({ x: 0, y: 0 }) }} title="Click to enlarge">
                <img src={infographicImage} alt="AI-generated infographic" />
              </div>
            ) : null}
          </div>
        )}

        {/* Infographic Lightbox */}
        {lightboxOpen && infographicImage && (
          <div className="v2-lightbox" onClick={e => { if (e.target === e.currentTarget) { setLightboxOpen(false) } }}>
            <button className="v2-lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
            <div
              className="v2-lightbox-img-wrap"
              onWheel={e => {
                e.preventDefault()
                setLightboxZoom(z => Math.min(5, Math.max(0.5, z + (e.deltaY < 0 ? 0.2 : -0.2))))
              }}
              onMouseDown={e => {
                if (lightboxZoom <= 1) return
                lightboxDrag.current = { startX: e.clientX - lightboxPan.x, startY: e.clientY - lightboxPan.y }
              }}
              onMouseMove={e => {
                if (!lightboxDrag.current) return
                setLightboxPan({ x: e.clientX - lightboxDrag.current.startX, y: e.clientY - lightboxDrag.current.startY })
              }}
              onMouseUp={() => { lightboxDrag.current = null }}
              onMouseLeave={() => { lightboxDrag.current = null }}
            >
              <img
                src={infographicImage}
                alt="AI-generated infographic"
                style={{ transform: `scale(${lightboxZoom}) translate(${lightboxPan.x / lightboxZoom}px, ${lightboxPan.y / lightboxZoom}px)`, maxWidth: '85vw', maxHeight: '82vh' }}
                draggable={false}
              />
            </div>
            <div className="v2-lightbox-controls">
              <button className="v2-lightbox-btn" onClick={() => setLightboxZoom(z => Math.max(0.5, z - 0.3))}>−</button>
              <button className={`v2-lightbox-btn${lightboxZoom === 1 ? ' active' : ''}`} onClick={() => { setLightboxZoom(1); setLightboxPan({ x: 0, y: 0 }) }}>{Math.round(lightboxZoom * 100)}%</button>
              <button className="v2-lightbox-btn" onClick={() => setLightboxZoom(z => Math.min(5, z + 0.3))}>+</button>
            </div>
          </div>
        )}

        {/* Ask Q&A */}
        {!loading && visuals.length > 0 && (
          <div className="v2-ask" id="v2-ask" ref={el => sectionRefs.current['v2-ask'] = el} style={{ animationDelay: `${visuals.length * 0.1 + 0.2}s` }}>
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
      </main>
    </div>
  )
}
