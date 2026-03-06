import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useMultiChartGeneration from '../hooks/useMultiChartGeneration'
import useMultiChartGenerationClaude from '../hooks/useMultiChartGenerationClaude'
import useBackgroundPregen from '../hooks/useBackgroundPregen'
import useBackgroundPregenClaude from '../hooks/useBackgroundPregenClaude'
import ChartRouter from '../components/ChartRouter'
import ChartLoading from '../components/ChartLoading'
import ChartError from '../components/ChartError'
import ChartExportButton from '../components/charts/ChartExportButton'
import useSectionGeneration from '../hooks/useSectionGeneration'
import { askAI } from '../services/chartAI'

// ==================== CSS ====================
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
  --charity: #60a5fa;
  --company: #f59e0b;
  --red: #ef4444;
  --purple: #a78bfa;
  --teal: #5bf5dc;
  --gradient-accent: linear-gradient(135deg, #3dd68c, #5bf5dc);
  --gradient-surface: linear-gradient(135deg, rgba(14,17,23,0.9), rgba(21,25,33,0.9));
}
[data-theme="light"] {
  --bg: #F7F8F0;
  --surface: #ffffff;
  --surface-2: #eef1e8;
  --border: rgba(53,88,114,0.1);
  --text: #1a2d3d;
  --text-dim: #7AAACE;
  --accent: #355872;
  --accent-glow: rgba(53,88,114,0.1);
  --charity: #2563eb;
  --company: #d97706;
  --red: #dc2626;
  --purple: #7c3aed;
  --teal: #7AAACE;
  --gradient-accent: linear-gradient(135deg, #355872, #7AAACE);
  --gradient-surface: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(238,241,232,0.95));
}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;overflow-x:hidden;position:relative;}
body::before{content:'';position:fixed;top:-30%;left:-15%;width:60%;height:60%;background:radial-gradient(circle,rgba(61,214,140,0.04) 0%,transparent 65%);pointer-events:none;z-index:0;}
body::after{content:'';position:fixed;bottom:-25%;right:-15%;width:55%;height:55%;background:radial-gradient(circle,rgba(91,156,245,0.03) 0%,transparent 65%);pointer-events:none;z-index:0;}

.app-header{position:sticky;top:0;z-index:100;background:rgba(6,8,12,0.85);backdrop-filter:blur(24px);border-bottom:1px solid var(--border);padding:16px 40px;display:flex;align-items:center;justify-content:space-between;}
.app-header::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(61,214,140,0.15),transparent);}
.logo{font-family:'DM Serif Display',serif;font-size:22px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px;cursor:pointer;}
.logo span{color:var(--text-dim);font-size:13px;font-family:'DM Sans';margin-left:12px;-webkit-text-fill-color:var(--text-dim);}
.nav-pills{display:flex;gap:4px;background:rgba(14,17,23,0.8);border-radius:12px;padding:4px;border:1px solid var(--border);}
.nav-pill{padding:8px 16px;border-radius:9px;font-size:12px;font-weight:500;color:var(--text-dim);cursor:pointer;transition:all 0.25s;border:none;background:none;font-family:'DM Sans',sans-serif;}
.nav-pill:hover{color:var(--text);}
.nav-pill.active{background:linear-gradient(135deg,#3dd68c,#2bc47a);color:var(--bg);font-weight:600;box-shadow:0 2px 12px rgba(61,214,140,0.3);}

.section{max-width:1200px;margin:0 auto;padding:60px 40px;}
.section-label{font-family:'JetBrains Mono',monospace;font-size:13px;text-transform:uppercase;letter-spacing:2px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px;opacity:0;animation:fadeUp .6s ease forwards;}
.section-title{font-family:'DM Serif Display',serif;font-size:40px;letter-spacing:-0.5px;margin-bottom:8px;opacity:0;animation:fadeUp .6s ease .1s forwards;background:linear-gradient(135deg,#e8eaf0 30%,#8a90a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.section-subtitle{color:var(--text-dim);font-size:17px;max-width:700px;margin-bottom:40px;opacity:0;animation:fadeUp .6s ease .2s forwards;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}

.stats-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:40px;}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:22px;text-align:center;transition:all .3s;position:relative;overflow:hidden;}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0;transition:opacity .3s;}
.stat-card:hover{border-color:rgba(61,214,140,0.2);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,0.3);}
.stat-card:hover::before{opacity:1;}
.stat-value{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.stat-label{font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.5px;margin-top:6px;font-family:'JetBrains Mono',monospace;}

.transcript-layout{display:grid;grid-template-columns:2fr 3fr;gap:24px;margin-bottom:60px;}
.transcript-panel{background:var(--surface);border-radius:20px;border:1px solid var(--border);display:flex;flex-direction:column;height:700px;transition:box-shadow .3s;}
.transcript-panel:hover{box-shadow:0 4px 24px rgba(0,0,0,0.2);}
.visual-panel{background:var(--surface);border-radius:20px;border:1px solid var(--border);overflow:hidden;display:flex;flex-direction:column;height:700px;transition:box-shadow .3s;}
.visual-panel:hover{box-shadow:0 4px 24px rgba(0,0,0,0.2);}
.panel-header{padding:18px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:var(--text-dim);flex-shrink:0;text-transform:uppercase;letter-spacing:1px;font-family:'JetBrains Mono',monospace;}
.panel-header .dot{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:pulse 2s infinite;box-shadow:0 0 8px var(--accent-glow);}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
.transcript-body{padding:24px;overflow-y:auto;flex:1;}
.t-line{padding:14px 18px;border-radius:12px;margin-bottom:8px;font-size:15px;line-height:1.75;cursor:pointer;transition:all .3s cubic-bezier(0.4,0,0.2,1);border-left:3px solid transparent;position:relative;}
.t-line:hover{background:var(--surface-2);transform:translateX(2px);}
.t-line.active{background:linear-gradient(135deg,rgba(61,214,140,0.08),rgba(91,245,220,0.04));border-left-color:var(--accent);box-shadow:0 2px 12px rgba(61,214,140,0.06);}
.t-line .speaker{font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;display:block;}
.t-line .speaker.host{color:var(--charity);}
.t-line .speaker.guest{color:var(--company);}
.t-line .timestamp{position:absolute;right:12px;top:12px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-dim);opacity:0;transition:opacity .2s;}
.t-line:hover .timestamp{opacity:1;}

.visual-modes{display:flex;gap:4px;padding:12px 24px;border-bottom:1px solid var(--border);background:rgba(14,17,23,0.6);backdrop-filter:blur(8px);flex-wrap:wrap;flex-shrink:0;}
.vmode-btn{padding:6px 14px;border-radius:7px;font-size:11px;font-weight:600;color:var(--text-dim);cursor:pointer;transition:all .25s cubic-bezier(0.4,0,0.2,1);border:1px solid transparent;background:none;font-family:'DM Sans',sans-serif;}
.vmode-btn:hover{color:var(--text);border-color:rgba(61,214,140,0.2);background:rgba(61,214,140,0.04);}
.vmode-btn.active{background:linear-gradient(135deg,#3dd68c,#2bc47a);color:var(--bg);border-color:transparent;box-shadow:0 2px 12px rgba(61,214,140,0.3);}
.visual-content{flex:1;padding:16px;display:flex;flex-direction:column;overflow:hidden;transition:opacity .3s ease;min-height:0;}
.visual-content.fading{opacity:0;}
.visual-dialogue-label{display:flex;align-items:center;gap:8px;padding-bottom:14px;border-bottom:1px solid var(--border);margin-bottom:16px;font-size:13px;flex-shrink:0;}
.vdl-step{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent);background:rgba(61,214,140,0.08);padding:2px 8px;border-radius:4px;}
.vdl-speaker{font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:1px;}
.vdl-text{color:var(--text-dim);font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.visual-chart-area{flex:1;display:flex;flex-direction:column;min-height:0;overflow:auto;}
.visual-chart-area>div{flex:1;min-height:0;max-height:100%;}
.dialogue-progress-inline{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-dim);background:rgba(61,214,140,0.06);padding:3px 8px;border-radius:4px;}

.flow-container{width:100%;display:flex;flex-direction:column;align-items:center;gap:0;}
.flow-node{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid var(--border);border-radius:16px;padding:20px 28px;text-align:center;width:280px;position:relative;transition:all .4s cubic-bezier(0.4,0,0.2,1);overflow:hidden;}
.flow-node::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),var(--teal),transparent);opacity:0;transition:opacity .3s;}
.flow-node:hover{border-color:rgba(61,214,140,0.3);box-shadow:0 8px 32px rgba(61,214,140,0.1);transform:translateY(-2px);}
.flow-node:hover::before{opacity:1;}
.flow-node .node-icon{font-size:28px;margin-bottom:8px;}
.flow-node .node-title{font-weight:600;font-size:15px;margin-bottom:4px;}
.flow-node .node-detail{font-size:12px;color:var(--text-dim);}
.flow-node .node-amount{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-top:6px;}
.flow-arrow{width:2px;height:36px;background:linear-gradient(to bottom,rgba(61,214,140,0.2),var(--accent));position:relative;}
.flow-arrow::after{content:'';position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid var(--accent);}

.info-card{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid var(--border);border-radius:16px;padding:24px;width:100%;position:relative;overflow:hidden;transition:all .3s;}
.info-card:hover{border-color:rgba(61,214,140,0.2);box-shadow:0 4px 20px rgba(0,0,0,0.3);}
.info-card .info-big-number{font-family:'JetBrains Mono',monospace;font-size:56px;font-weight:700;line-height:1;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.info-card .info-label{font-size:13px;color:var(--text-dim);margin-top:4px;}
.info-row{display:flex;gap:16px;width:100%;margin-bottom:16px;}
.info-row .info-card{flex:1;}
.info-metric-bar{height:8px;border-radius:4px;background:var(--bg);overflow:hidden;margin-top:12px;}
.info-metric-fill{height:100%;border-radius:4px;transition:width 1s ease;}
.info-icon-row{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.info-icon-circle{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
.info-steps{display:flex;gap:12px;width:100%;}
.info-step{flex:1;text-align:center;padding:16px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:12px;position:relative;}
.info-step .step-num{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--accent);letter-spacing:2px;margin-bottom:6px;}
.info-step .step-icon{font-size:28px;margin-bottom:6px;}
.info-step .step-label{font-size:12px;font-weight:600;}
.info-step-connector{position:absolute;right:-16px;top:50%;transform:translateY(-50%);color:var(--accent);font-size:16px;z-index:2;}

.napkin-board{width:100%;background:rgba(30,32,40,0.6);border-radius:16px;padding:32px;border:2px dashed rgba(255,255,255,0.08);position:relative;backdrop-filter:blur(4px);}
.napkin-board::before{content:'NAPKIN VIEW';position:absolute;top:10px;right:14px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-dim);opacity:0.4;letter-spacing:2px;}
.napkin-blob{display:inline-block;border:2px solid;border-radius:50px;padding:12px 20px;font-size:13px;font-weight:600;position:relative;background:rgba(255,255,255,0.03);}
.napkin-arrow{display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-family:'JetBrains Mono',monospace;font-size:20px;padding:4px 0;}
.napkin-note{background:rgba(255,255,0,0.06);border:1px solid rgba(255,255,0,0.15);border-radius:8px;padding:10px 14px;font-size:11px;color:var(--text-dim);font-style:italic;margin-top:12px;}
.napkin-flow{display:flex;flex-direction:column;align-items:center;gap:4px;}
.napkin-hflow{display:flex;align-items:center;gap:16px;justify-content:center;flex-wrap:wrap;}
.napkin-box{border:2px solid var(--border);border-radius:12px;padding:14px 20px;text-align:center;background:rgba(255,255,255,0.02);min-width:120px;}
.napkin-box.accent{border-color:var(--accent);color:var(--accent);}
.napkin-box .nb-icon{font-size:22px;margin-bottom:4px;}
.napkin-box .nb-label{font-size:12px;font-weight:600;}
.napkin-box .nb-detail{font-size:10px;color:var(--text-dim);margin-top:2px;}
.napkin-connector{color:var(--accent);font-family:'JetBrains Mono',monospace;font-size:18px;}

.sankey-container{width:100%;padding:10px 0;}
.sankey-row{display:flex;align-items:center;gap:0;width:100%;margin-bottom:4px;transition:transform .2s;}
.sankey-row:hover{transform:translateX(4px);}
.sankey-label{width:100px;text-align:right;font-size:12px;font-weight:600;padding-right:14px;flex-shrink:0;}
.sankey-bar-wrap{flex:1;height:36px;position:relative;border-radius:8px;overflow:hidden;background:rgba(6,8,12,0.4);}
.sankey-bar{height:100%;border-radius:8px;display:flex;align-items:center;padding:0 14px;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;transition:width 1.2s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;}
.sankey-bar::after{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.08) 50%,transparent 100%);animation:shimmer 2.5s infinite;}
@keyframes shimmer{0%{transform:translateX(-100%);}100%{transform:translateX(100%)}}
.sankey-bar .sankey-val{position:relative;z-index:1;}
.sankey-end{width:80px;text-align:left;font-size:11px;color:var(--text-dim);padding-left:10px;flex-shrink:0;}
.sankey-divider{width:100%;height:1px;background:var(--border);margin:12px 0;}

.compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%;}
.compare-card{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center;transition:all .3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;}
.compare-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0;transition:opacity .3s;}
.compare-card:hover{border-color:rgba(61,214,140,0.2);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.3);}
.compare-card:hover::before{opacity:1;}
.compare-card .cc-icon{font-size:32px;margin-bottom:8px;}
.compare-card .cc-title{font-size:14px;font-weight:600;margin-bottom:4px;}
.compare-card .cc-detail{font-size:12px;color:var(--text-dim);}
.compare-card .cc-val{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;margin-top:8px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}

.timeline-track{display:flex;align-items:flex-start;gap:0;width:100%;overflow-x:auto;padding:20px 0 30px;scrollbar-width:thin;}
.timeline-node{flex-shrink:0;display:flex;flex-direction:column;align-items:center;width:140px;cursor:pointer;position:relative;transition:all .25s;}
.timeline-node:hover{transform:translateY(-2px);}
.timeline-dot{width:16px;height:16px;border-radius:50%;border:3px solid rgba(255,255,255,0.1);background:var(--bg);transition:all .3s cubic-bezier(0.4,0,0.2,1);z-index:2;}
.timeline-node.active .timeline-dot{border-color:var(--accent);background:var(--accent);box-shadow:0 0 16px rgba(61,214,140,0.3),0 0 4px rgba(61,214,140,0.5);}
.timeline-node:hover .timeline-dot{border-color:var(--accent);box-shadow:0 0 8px rgba(61,214,140,0.15);}
.timeline-label{font-size:11px;color:var(--text-dim);margin-top:10px;text-align:center;font-weight:500;max-width:110px;transition:color .2s;}
.timeline-node:hover .timeline-label{color:var(--text);}
.timeline-node.active .timeline-label{color:var(--accent);}
.timeline-time{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-dim);margin-top:4px;opacity:0.6;}
.timeline-line{position:absolute;top:8px;left:50%;width:140px;height:2px;background:rgba(255,255,255,0.06);z-index:1;}
.timeline-node:last-child .timeline-line{display:none;}
.timeline-node.active .timeline-line{background:linear-gradient(90deg,var(--accent),rgba(61,214,140,0.1));}

.speaker-bars{width:100%;display:flex;flex-direction:column;gap:14px;}
.speaker-bar-row{display:flex;align-items:center;gap:14px;transition:transform .2s;}
.speaker-bar-row:hover{transform:translateX(4px);}
.speaker-bar-label{width:90px;font-size:15px;font-weight:600;flex-shrink:0;}
.speaker-bar-label.host{color:var(--charity);}
.speaker-bar-label.guest{color:var(--company);}
.speaker-bar-track{flex:1;height:32px;background:rgba(6,8,12,0.8);border-radius:8px;overflow:hidden;border:1px solid var(--border);}
.speaker-bar-fill{height:100%;border-radius:7px;display:flex;align-items:center;padding-left:12px;font-size:11px;font-weight:600;font-family:'JetBrains Mono',monospace;transition:width 1.2s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;color:var(--bg);}
.speaker-bar-fill::after{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);animation:shimmer 2.5s infinite;}
.speaker-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%;margin-top:20px;}
.speaker-stat{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid var(--border);border-radius:12px;padding:18px;text-align:center;transition:all .3s;}
.speaker-stat:hover{border-color:rgba(61,214,140,0.2);transform:translateY(-2px);}
.speaker-stat .ss-val{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;}
.speaker-stat .ss-label{font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-top:2px;font-family:'JetBrains Mono',monospace;}

.concepts-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
.concept-card{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid var(--border);border-radius:16px;padding:28px;transition:all .35s cubic-bezier(0.4,0,0.2,1);cursor:default;position:relative;overflow:hidden;}
.concept-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),var(--teal));opacity:0;transition:opacity .3s;}
.concept-card:hover{border-color:rgba(61,214,140,0.25);transform:translateY(-4px);box-shadow:0 12px 40px rgba(61,214,140,0.06);}
.concept-card:hover::before{opacity:1;}
.concept-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:16px;}
.concept-card:nth-child(1) .concept-icon{background:rgba(61,214,140,0.12);}
.concept-card:nth-child(2) .concept-icon{background:rgba(91,156,245,0.12);}
.concept-card:nth-child(3) .concept-icon{background:rgba(245,168,91,0.12);}
.concept-card:nth-child(4) .concept-icon{background:rgba(164,123,245,0.12);}
.concept-card:nth-child(5) .concept-icon{background:rgba(245,91,91,0.12);}
.concept-card:nth-child(6) .concept-icon{background:rgba(91,245,220,0.12);}
.concept-term{font-weight:700;font-size:18px;margin-bottom:6px;}
.concept-def{font-size:15px;color:var(--text-dim);line-height:1.7;}
.concept-tag{display:inline-block;margin-top:12px;font-family:'JetBrains Mono',monospace;font-size:10px;padding:4px 10px;border-radius:6px;background:rgba(61,214,140,0.06);color:var(--accent);border:1px solid rgba(61,214,140,0.1);}

.suggestions-list{display:flex;flex-direction:column;gap:16px;}
.suggestion-item{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid var(--border);border-radius:16px;padding:24px 28px;display:flex;gap:20px;align-items:flex-start;transition:all .35s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;}
.suggestion-item::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(to bottom,var(--purple),rgba(164,123,245,0.3));opacity:0;transition:opacity .3s;}
.suggestion-item:hover{border-color:rgba(164,123,245,0.25);transform:translateX(4px);box-shadow:0 4px 24px rgba(164,123,245,0.06);}
.suggestion-item:hover::before{opacity:1;}
.suggestion-number{font-family:'DM Serif Display',serif;font-size:28px;background:linear-gradient(135deg,#a78bfa,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;min-width:36px;}
.suggestion-content h4{font-size:17px;font-weight:600;margin-bottom:4px;}
.suggestion-content p{font-size:15px;color:var(--text-dim);line-height:1.7;}
.suggestion-badge{font-size:10px;font-family:'JetBrains Mono',monospace;padding:3px 8px;border-radius:4px;margin-top:8px;display:inline-block;}
.badge-ux{background:rgba(164,123,245,0.15);color:var(--purple);}
.badge-biz{background:rgba(61,214,140,0.15);color:var(--accent);}
.badge-tech{background:rgba(91,156,245,0.15);color:var(--charity);}

.quiz-container{display:flex;flex-direction:column;gap:28px;}
.quiz-card{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid var(--border);border-radius:16px;padding:28px;transition:all .3s;}
.quiz-card:hover{border-color:rgba(61,214,140,0.15);box-shadow:0 4px 20px rgba(0,0,0,0.2);}
.quiz-number{font-family:'JetBrains Mono',monospace;font-size:10px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;}
.quiz-question{font-size:19px;font-weight:600;margin-bottom:18px;}
.quiz-options{display:flex;flex-direction:column;gap:8px;}
.quiz-option{padding:14px 18px;background:rgba(14,17,23,0.6);border:1px solid var(--border);border-radius:12px;font-size:15px;cursor:pointer;transition:all .25s cubic-bezier(0.4,0,0.2,1);display:flex;align-items:center;gap:12px;}
.quiz-option:hover{border-color:rgba(61,214,140,0.3);background:rgba(61,214,140,0.04);transform:translateX(4px);}
.quiz-option.selected.correct{border-color:var(--accent);background:rgba(61,214,140,0.1);box-shadow:0 0 20px rgba(61,214,140,0.06);}
.quiz-option.selected.wrong{border-color:var(--red);background:rgba(245,91,91,0.08);}
.option-letter{width:28px;height:28px;border-radius:8px;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;flex-shrink:0;transition:all .25s;}
.quiz-option:hover .option-letter{border-color:rgba(61,214,140,0.3);color:var(--accent);}
.quiz-feedback{margin-top:14px;padding:14px 18px;border-radius:10px;font-size:13px;line-height:1.6;display:none;}
.quiz-feedback.show{display:block;}
.quiz-feedback.correct{background:rgba(61,214,140,0.08);color:var(--accent);border:1px solid rgba(61,214,140,0.2);}
.quiz-feedback.wrong{background:rgba(245,91,91,0.08);color:var(--red);border:1px solid rgba(245,91,91,0.2);}
.quiz-score-bar{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid var(--border);border-radius:16px;padding:20px 24px;display:flex;align-items:center;gap:20px;margin-bottom:20px;}
.quiz-score-ring{width:60px;height:60px;border-radius:50%;border:4px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;flex-shrink:0;transition:all .5s;box-shadow:0 0 20px rgba(61,214,140,0.08);}
.quiz-score-info{flex:1;}
.quiz-score-info .qsi-title{font-size:14px;font-weight:600;margin-bottom:2px;}
.quiz-score-info .qsi-sub{font-size:12px;color:var(--text-dim);}

.ask-container{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid var(--border);border-radius:20px;overflow:hidden;}
.ask-input-area{padding:24px;display:flex;gap:12px;border-bottom:1px solid var(--border);background:rgba(6,8,12,0.3);}
.ask-input{flex:1;background:rgba(6,8,12,0.6);border:1px solid var(--border);border-radius:12px;padding:14px 18px;font-size:16px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none;transition:all .25s;}
.ask-input:focus{border-color:rgba(61,214,140,0.4);box-shadow:0 0 0 3px rgba(61,214,140,0.08);}
.ask-input::placeholder{color:var(--text-dim);}
.ask-btn{padding:14px 24px;background:linear-gradient(135deg,#3dd68c,#2bc47a);color:var(--bg);border:none;border-radius:12px;font-weight:600;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .25s cubic-bezier(0.4,0,0.2,1);}
.ask-btn:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(61,214,140,0.3);}
.ask-threads{padding:24px;display:flex;flex-direction:column;gap:16px;max-height:400px;overflow-y:auto;}
.thread-item{display:flex;gap:14px;}
.thread-avatar{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.thread-avatar.user{background:rgba(91,156,245,0.15);}
.thread-avatar.ai{background:rgba(61,214,140,0.15);}
.thread-content{flex:1;}
.thread-name{font-size:12px;font-weight:600;margin-bottom:4px;}
.thread-name.user{color:var(--charity);}
.thread-name.ai{color:var(--accent);}
.thread-text{font-size:15px;color:var(--text-dim);line-height:1.7;}
.suggested-questions{display:flex;flex-wrap:wrap;gap:8px;padding:0 24px 24px;}
.sq-chip{padding:8px 14px;background:rgba(6,8,12,0.4);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text-dim);cursor:pointer;transition:all .25s cubic-bezier(0.4,0,0.2,1);font-family:'DM Sans',sans-serif;}
.sq-chip:hover{border-color:rgba(61,214,140,0.3);color:var(--accent);background:rgba(61,214,140,0.04);transform:translateY(-1px);}

.action-items-list{display:flex;flex-direction:column;gap:12px;}
.action-item{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid var(--border);border-radius:14px;padding:18px 22px;display:flex;align-items:flex-start;gap:14px;transition:all .35s cubic-bezier(0.4,0,0.2,1);}
.action-item:hover{border-color:rgba(61,214,140,0.25);transform:translateX(4px);box-shadow:0 4px 20px rgba(0,0,0,0.2);}
.action-check{width:22px;height:22px;border-radius:7px;border:2px solid rgba(255,255,255,0.12);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .3s cubic-bezier(0.4,0,0.2,1);margin-top:2px;}
.action-check:hover{border-color:rgba(61,214,140,0.4);}
.action-check.done{background:linear-gradient(135deg,#3dd68c,#2bc47a);border-color:transparent;box-shadow:0 2px 8px rgba(61,214,140,0.3);}
.action-text{flex:1;}
.action-text h4{font-size:16px;font-weight:600;margin-bottom:2px;}
.action-text p{font-size:14px;color:var(--text-dim);}
.action-text.done h4{text-decoration:line-through;color:var(--text-dim);}
.action-priority{font-size:9px;font-family:'JetBrains Mono',monospace;padding:3px 8px;border-radius:4px;font-weight:600;}
.priority-high{background:rgba(245,91,91,0.15);color:var(--red);}
.priority-med{background:rgba(245,168,91,0.15);color:var(--company);}
.priority-low{background:rgba(91,156,245,0.15);color:var(--charity);}

.section-divider{max-width:1200px;margin:0 auto;padding:0 40px;}
.section-divider hr{border:none;border-top:1px solid var(--border);background:linear-gradient(90deg,transparent,rgba(61,214,140,0.1),transparent);height:1px;}
::-webkit-scrollbar{width:6px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
::-webkit-scrollbar-thumb:hover{background:var(--text-dim);}

@media(max-width:900px){
  .transcript-layout{grid-template-columns:2fr 3fr;gap:12px;}
  .transcript-panel,.visual-panel{height:520px;border-radius:14px;}
  .concepts-grid{grid-template-columns:1fr 1fr;}
  .stats-bar{grid-template-columns:repeat(4,1fr);gap:8px;}
  .stat-card{padding:14px 10px;}
  .stat-value{font-size:22px;}
  .section{padding:40px 16px;}
  .app-header{padding:12px 16px;flex-wrap:wrap;gap:8px;}
  .nav-pills{overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
  .nav-pills::-webkit-scrollbar{display:none;}
  .nav-pill{white-space:nowrap;padding:6px 12px;font-size:11px;}
  .compare-grid{grid-template-columns:1fr;}
  .speaker-stat-grid{grid-template-columns:1fr 1fr;}
  .panel-header{padding:12px 16px;font-size:10px;}
  .visual-modes{padding:8px 12px;}
  .vmode-btn{padding:5px 10px;font-size:10px;}
  .transcript-body{padding:16px;}
  .visual-content{padding:12px;}
  .flow-node{width:220px;padding:14px 18px;}
  .flow-node .node-title{font-size:13px;}
  .flow-node .node-amount{font-size:18px;}
  .section-title{font-size:28px;}
  .suggestion-item{padding:18px 20px;gap:14px;}
  .suggestion-number{font-size:22px;}
  .timeline-node{width:110px;}
  .sankey-label{width:70px;font-size:10px;}
}
@media(max-width:600px){
  .transcript-layout{grid-template-columns:1fr;gap:8px;}
  .transcript-panel,.visual-panel{height:450px;border-radius:12px;}
  .visual-content{padding:10px;}
  .stats-bar{grid-template-columns:1fr 1fr;gap:8px;}
  .concepts-grid{grid-template-columns:1fr;}
  .info-row{flex-direction:column;}
  .info-steps{flex-direction:column;}
  .section-title{font-size:24px;}
  .section{padding:32px 12px;}
  .app-header{padding:10px 12px;}
  .flow-node{width:180px;padding:12px 14px;}
  .flow-node .node-icon{font-size:22px;}
  .flow-node .node-title{font-size:12px;}
  .flow-node .node-amount{font-size:16px;}
  .flow-arrow{height:24px;}
  .t-line{padding:8px 10px;font-size:12px;}
  .napkin-board{padding:16px;}
  .compare-grid{grid-template-columns:1fr;}
  .sankey-label{width:50px;font-size:9px;}
  .sankey-bar{font-size:9px;}
}

/* ===== LIGHT MODE OVERRIDES ===== */
[data-theme="light"] body{background:#F7F8F0;color:#1a2d3d;}
[data-theme="light"] body::before{background:radial-gradient(circle,rgba(156,213,255,0.1) 0%,transparent 65%);}
[data-theme="light"] body::after{background:radial-gradient(circle,rgba(122,170,206,0.08) 0%,transparent 65%);}
[data-theme="light"] .app-header{background:rgba(255,255,255,0.92);border-bottom-color:rgba(53,88,114,0.08);}
[data-theme="light"] .app-header::after{background:linear-gradient(90deg,transparent,rgba(53,88,114,0.15),transparent);}
[data-theme="light"] .logo{background:linear-gradient(135deg,#355872,#7AAACE);-webkit-background-clip:text;}
[data-theme="light"] .logo span{color:#7AAACE;-webkit-text-fill-color:#7AAACE;}
[data-theme="light"] .nav-pills{background:rgba(255,255,255,0.8);border-color:rgba(53,88,114,0.1);}
[data-theme="light"] .nav-pill{color:#7AAACE;}
[data-theme="light"] .nav-pill:hover{color:#1a2d3d;}
[data-theme="light"] .nav-pill.active{background:linear-gradient(135deg,#355872,#7AAACE);color:#F7F8F0;box-shadow:0 2px 12px rgba(53,88,114,0.25);}
[data-theme="light"] .section-label{background:linear-gradient(135deg,#355872,#7AAACE);-webkit-background-clip:text;}
[data-theme="light"] .section-title{background:linear-gradient(135deg,#1a2d3d 30%,#7AAACE);-webkit-background-clip:text;}
[data-theme="light"] .stat-card{background:#ffffff;border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .stat-card::before{background:linear-gradient(90deg,transparent,#7AAACE,transparent);}
[data-theme="light"] .stat-card:hover{border-color:rgba(53,88,114,0.2);box-shadow:0 8px 32px rgba(53,88,114,0.08);}
[data-theme="light"] .stat-value{background:linear-gradient(135deg,#355872,#7AAACE);-webkit-background-clip:text;}
[data-theme="light"] .transcript-panel{background:#ffffff;border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .transcript-panel:hover{box-shadow:0 4px 24px rgba(53,88,114,0.08);}
[data-theme="light"] .visual-panel{background:#ffffff;border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .visual-panel:hover{box-shadow:0 4px 24px rgba(53,88,114,0.08);}
[data-theme="light"] .panel-header{border-bottom-color:rgba(53,88,114,0.08);}
[data-theme="light"] .panel-header .dot{background:#355872;box-shadow:0 0 8px rgba(53,88,114,0.2);}
[data-theme="light"] .t-line:hover{background:rgba(156,213,255,0.1);}
[data-theme="light"] .t-line.active{background:linear-gradient(135deg,rgba(53,88,114,0.06),rgba(122,170,206,0.06));border-left-color:#355872;box-shadow:0 2px 12px rgba(53,88,114,0.04);}
[data-theme="light"] .t-line .speaker.host{color:#2563eb;}
[data-theme="light"] .t-line .speaker.guest{color:#d97706;}
[data-theme="light"] .visual-modes{background:rgba(255,255,255,0.7);border-bottom-color:rgba(53,88,114,0.08);}
[data-theme="light"] .vmode-btn{color:#7AAACE;}
[data-theme="light"] .vmode-btn:hover{color:#1a2d3d;border-color:rgba(53,88,114,0.2);background:rgba(53,88,114,0.04);}
[data-theme="light"] .vmode-btn.active{background:linear-gradient(135deg,#355872,#7AAACE);color:#F7F8F0;box-shadow:0 2px 12px rgba(53,88,114,0.25);}
[data-theme="light"] .vdl-step{color:#1a2d3d;background:rgba(53,88,114,0.06);}
[data-theme="light"] .flow-node{background:var(--gradient-surface);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .flow-node::before{background:linear-gradient(90deg,transparent,#7AAACE,transparent);}
[data-theme="light"] .flow-node:hover{border-color:rgba(53,88,114,0.25);box-shadow:0 8px 32px rgba(53,88,114,0.08);}
[data-theme="light"] .flow-node .node-amount{background:linear-gradient(135deg,#355872,#7AAACE);-webkit-background-clip:text;}
[data-theme="light"] .flow-arrow{background:linear-gradient(to bottom,rgba(53,88,114,0.15),#355872);}
[data-theme="light"] .flow-arrow::after{border-top-color:#355872;}
[data-theme="light"] .info-card{background:var(--gradient-surface);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .info-card:hover{border-color:rgba(53,88,114,0.2);box-shadow:0 4px 20px rgba(53,88,114,0.08);}
[data-theme="light"] .info-card .info-big-number{background:linear-gradient(135deg,#355872,#7AAACE);-webkit-background-clip:text;}
[data-theme="light"] .info-metric-bar{background:rgba(53,88,114,0.06);}
[data-theme="light"] .info-step{background:#eef1e8;border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .info-step .step-num{color:#355872;}
[data-theme="light"] .info-step-connector{color:#355872;}
[data-theme="light"] .napkin-board{background:rgba(255,255,255,0.6);border-color:rgba(53,88,114,0.12);}
[data-theme="light"] .napkin-board::before{color:#7AAACE;}
[data-theme="light"] .napkin-blob{background:rgba(53,88,114,0.04);}
[data-theme="light"] .napkin-note{background:rgba(53,88,114,0.04);border-color:rgba(53,88,114,0.1);}
[data-theme="light"] .napkin-box{border-color:rgba(53,88,114,0.12);background:rgba(255,255,255,0.5);}
[data-theme="light"] .napkin-box.accent{border-color:#355872;color:#355872;}
[data-theme="light"] .napkin-connector{color:#355872;}
[data-theme="light"] .sankey-bar-wrap{background:rgba(53,88,114,0.04);}
[data-theme="light"] .compare-card{background:var(--gradient-surface);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .compare-card:hover{border-color:rgba(53,88,114,0.2);box-shadow:0 8px 24px rgba(53,88,114,0.08);}
[data-theme="light"] .compare-card .cc-val{background:linear-gradient(135deg,#355872,#7AAACE);-webkit-background-clip:text;}
[data-theme="light"] .timeline-dot{border-color:rgba(53,88,114,0.15);background:#F7F8F0;}
[data-theme="light"] .timeline-node.active .timeline-dot{border-color:#355872;background:#355872;box-shadow:0 0 16px rgba(53,88,114,0.2);}
[data-theme="light"] .timeline-node:hover .timeline-dot{border-color:#355872;box-shadow:0 0 8px rgba(53,88,114,0.1);}
[data-theme="light"] .timeline-node.active .timeline-label{color:#355872;}
[data-theme="light"] .timeline-line{background:rgba(53,88,114,0.08);}
[data-theme="light"] .timeline-node.active .timeline-line{background:linear-gradient(90deg,#355872,rgba(53,88,114,0.1));}
[data-theme="light"] .speaker-bar-track{background:rgba(53,88,114,0.04);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .speaker-bar-fill{color:#F7F8F0;}
[data-theme="light"] .speaker-stat{background:var(--gradient-surface);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .speaker-stat:hover{border-color:rgba(53,88,114,0.2);}
[data-theme="light"] .concept-card{background:var(--gradient-surface);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .concept-card::before{background:linear-gradient(90deg,#355872,#7AAACE);}
[data-theme="light"] .concept-card:hover{border-color:rgba(53,88,114,0.2);box-shadow:0 12px 40px rgba(53,88,114,0.06);}
[data-theme="light"] .concept-card:nth-child(1) .concept-icon{background:rgba(53,88,114,0.1);}
[data-theme="light"] .concept-card:nth-child(2) .concept-icon{background:rgba(37,99,235,0.1);}
[data-theme="light"] .concept-card:nth-child(3) .concept-icon{background:rgba(217,119,6,0.1);}
[data-theme="light"] .concept-card:nth-child(4) .concept-icon{background:rgba(124,58,237,0.1);}
[data-theme="light"] .concept-card:nth-child(5) .concept-icon{background:rgba(220,38,38,0.1);}
[data-theme="light"] .concept-card:nth-child(6) .concept-icon{background:rgba(122,170,206,0.12);}
[data-theme="light"] .concept-tag{background:rgba(53,88,114,0.06);color:#355872;border-color:rgba(53,88,114,0.1);}
[data-theme="light"] .suggestion-item{background:var(--gradient-surface);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .suggestion-item::before{background:linear-gradient(to bottom,#7c3aed,rgba(124,58,237,0.3));}
[data-theme="light"] .suggestion-item:hover{border-color:rgba(124,58,237,0.2);box-shadow:0 4px 24px rgba(124,58,237,0.06);}
[data-theme="light"] .suggestion-number{background:linear-gradient(135deg,#7c3aed,#a78bfa);-webkit-background-clip:text;}
[data-theme="light"] .badge-ux{background:rgba(124,58,237,0.1);color:#7c3aed;}
[data-theme="light"] .badge-biz{background:rgba(53,88,114,0.1);color:#355872;}
[data-theme="light"] .badge-tech{background:rgba(37,99,235,0.1);color:#2563eb;}
[data-theme="light"] .quiz-card{background:var(--gradient-surface);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .quiz-card:hover{border-color:rgba(53,88,114,0.15);box-shadow:0 4px 20px rgba(53,88,114,0.06);}
[data-theme="light"] .quiz-number{background:linear-gradient(135deg,#355872,#7AAACE);-webkit-background-clip:text;}
[data-theme="light"] .quiz-option{background:rgba(247,248,240,0.6);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .quiz-option:hover{border-color:rgba(53,88,114,0.25);background:rgba(53,88,114,0.04);}
[data-theme="light"] .quiz-option.selected.correct{border-color:#16a34a;background:rgba(22,163,74,0.06);}
[data-theme="light"] .quiz-option.selected.wrong{border-color:#dc2626;background:rgba(220,38,38,0.06);}
[data-theme="light"] .option-letter{background:#F7F8F0;border-color:rgba(53,88,114,0.1);}
[data-theme="light"] .quiz-option:hover .option-letter{border-color:rgba(53,88,114,0.3);color:#1a2d3d;}
[data-theme="light"] .quiz-feedback.correct{background:rgba(22,163,74,0.06);color:#16a34a;border-color:rgba(22,163,74,0.2);}
[data-theme="light"] .quiz-feedback.wrong{background:rgba(220,38,38,0.06);color:#dc2626;border-color:rgba(220,38,38,0.2);}
[data-theme="light"] .quiz-score-bar{background:var(--gradient-surface);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .quiz-score-ring{border-color:rgba(53,88,114,0.1);box-shadow:0 0 20px rgba(53,88,114,0.06);}
[data-theme="light"] .ask-container{background:var(--gradient-surface);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .ask-input-area{border-bottom-color:rgba(53,88,114,0.08);background:rgba(247,248,240,0.5);}
[data-theme="light"] .ask-input{background:rgba(255,255,255,0.8);border-color:rgba(53,88,114,0.1);color:#1a2d3d;}
[data-theme="light"] .ask-input:focus{border-color:rgba(53,88,114,0.4);box-shadow:0 0 0 3px rgba(53,88,114,0.06);}
[data-theme="light"] .ask-input::placeholder{color:#9CD5FF;}
[data-theme="light"] .ask-btn{background:linear-gradient(135deg,#355872,#7AAACE);color:#F7F8F0;}
[data-theme="light"] .ask-btn:hover{box-shadow:0 4px 20px rgba(53,88,114,0.25);}
[data-theme="light"] .thread-avatar.user{background:rgba(37,99,235,0.1);}
[data-theme="light"] .thread-avatar.ai{background:rgba(53,88,114,0.1);}
[data-theme="light"] .thread-name.user{color:#2563eb;}
[data-theme="light"] .thread-name.ai{color:#1a2d3d;}
[data-theme="light"] .sq-chip{background:rgba(255,255,255,0.6);border-color:rgba(53,88,114,0.1);color:#7AAACE;}
[data-theme="light"] .sq-chip:hover{border-color:rgba(53,88,114,0.3);color:#1a2d3d;background:rgba(53,88,114,0.04);}
[data-theme="light"] .action-item{background:var(--gradient-surface);border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .action-item:hover{border-color:rgba(53,88,114,0.2);box-shadow:0 4px 20px rgba(53,88,114,0.06);}
[data-theme="light"] .action-check{border-color:rgba(53,88,114,0.15);}
[data-theme="light"] .action-check:hover{border-color:rgba(53,88,114,0.4);}
[data-theme="light"] .action-check.done{background:linear-gradient(135deg,#355872,#7AAACE);box-shadow:0 2px 8px rgba(53,88,114,0.25);}
[data-theme="light"] .priority-high{background:rgba(220,38,38,0.08);color:#dc2626;}
[data-theme="light"] .priority-med{background:rgba(217,119,6,0.08);color:#d97706;}
[data-theme="light"] .priority-low{background:rgba(37,99,235,0.08);color:#2563eb;}
[data-theme="light"] .section-divider hr{border-top-color:rgba(53,88,114,0.08);background:linear-gradient(90deg,transparent,rgba(53,88,114,0.1),transparent);}
[data-theme="light"] ::-webkit-scrollbar-thumb{background:rgba(53,88,114,0.15);}
[data-theme="light"] ::-webkit-scrollbar-thumb:hover{background:rgba(53,88,114,0.3);}
`

// ==================== CHART GENERATION (AI-powered) ====================

const SECTIONS = ['transcript', 'timeline', 'speakers', 'concepts', 'suggestions', 'actions', 'quiz', 'ask']

// ==================== COMPONENT ====================
export default function VisualizePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state

  // Redirect if no data
  useEffect(() => {
    if (!state?.graphData) navigate('/', { replace: true })
  }, [state, navigate])

  const { title, content, graphData } = state || {}
  const lines = graphData?.lines || []
  const speakerEntries = Object.entries(graphData?.speakers || {})

  // AI-generated section data (concepts, suggestions, actionItems, quizData, suggestedQs)
  const { sections, loading: sectionsLoading, error: sectionsError } = useSectionGeneration(content)
  const concepts = sections?.concepts || []
  const suggestions = sections?.suggestions || []
  const actionItems = sections?.actionItems || []
  const quizData = sections?.quizData || []
  const suggestedQs = sections?.suggestedQs || []

  // Visual mode tabs — mapped to AI chart types
  const MODES = [
    { label: 'Flowchart', type: 'flowchart' },
    { label: 'Infographic', type: 'infographic' },
    { label: 'Napkin', type: 'mindmap' },
    { label: 'Sankey', type: 'timeline' },
    { label: 'Compare', type: 'comparison' },
  ]
  const [currentMode, setCurrentMode] = useState(0)
  const forcedType = MODES[currentMode].type

  // Napkin.ai chart generation
  const { charts, loading: chartLoadingSet, errors: chartErrors, progress, retryLine } = useMultiChartGeneration(lines, forcedType)
  const { totalDone, totalNeeded } = useBackgroundPregen(lines)

  // Claude chart generation (parallel)
  const { charts: claudeCharts, loading: claudeLoadingSet, errors: claudeErrors, progress: claudeProgress, retryLine: claudeRetryLine } = useMultiChartGenerationClaude(lines, forcedType)
  const { totalDone: claudeTotalDone, totalNeeded: claudeTotalNeeded } = useBackgroundPregenClaude(lines)

  // Toggle: 'napkin' or 'claude'
  const [chartSource, setChartSource] = useState('napkin')
  const chartExportRef = useRef(null)

  const [currentStep, setCurrentStep] = useState(0)
  const [activeNav, setActiveNav] = useState('transcript')
  const [quizAnswered, setQuizAnswered] = useState({})
  const [quizScore, setQuizScore] = useState(0)
  const [actionsDone, setActionsDone] = useState({})
  const [askInput, setAskInput] = useState('')
  const [threads, setThreads] = useState([])

  const transcriptRef = useRef(null)
  const sectionRefs = useRef({})

  // Inject CSS once
  useEffect(() => {
    const id = 'visualize-page-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = PAGE_CSS
      document.head.appendChild(style)
    }
    return () => {
      const el = document.getElementById(id)
      if (el) el.remove()
    }
  }, [])

  // Scroll-based transcript line highlighting
  useEffect(() => {
    const el = transcriptRef.current
    if (!el || lines.length === 0) return

    function detect() {
      const maxScroll = el.scrollHeight - el.clientHeight
      if (maxScroll <= 0) return
      const ratio = Math.min(1, Math.max(0, el.scrollTop / maxScroll))
      const total = lines.length
      const active = Math.min(total - 1, Math.floor(ratio * total))
      if (active !== currentStep) setCurrentStep(active)
    }

    el.addEventListener('scroll', detect)
    return () => el.removeEventListener('scroll', detect)
  }, [lines.length, currentStep])

  // Intersection observer for nav pills
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveNav(entry.target.id)
      })
    }, { threshold: 0.3 })

    SECTIONS.forEach(id => {
      const el = sectionRefs.current[id]
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  function scrollToSection(id) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth' })
  }

  function timelineJump(step) {
    setCurrentStep(step)
    scrollToSection('transcript')
  }

  function handleQuizAnswer(qi, oi) {
    if (quizAnswered[qi] !== undefined) return
    const correct = oi === quizData[qi].correct
    setQuizAnswered(prev => ({ ...prev, [qi]: { oi, correct } }))
    if (correct) setQuizScore(prev => prev + 1)
  }

  function toggleActionDone(i) {
    setActionsDone(prev => ({ ...prev, [i]: !prev[i] }))
  }

  async function askQuestion(q) {
    const question = q || askInput.trim()
    if (!question) return
    setAskInput('')
    setThreads(prev => [...prev, { type: 'user', text: question }, { type: 'ai', text: 'Thinking...' }])

    const { answer, error: err } = await askAI(content, question)
    const responseText = err ? `Sorry, something went wrong: ${err}` : answer

    setThreads(prev => {
      const updated = [...prev]
      updated[updated.length - 1] = { type: 'ai', text: responseText }
      return updated
    })
  }

  if (!state?.graphData) return null

  const totalAnswered = Object.keys(quizAnswered).length
  const scoreColor = quizScore === totalAnswered && totalAnswered > 0 ? 'var(--accent)' : totalAnswered === quizData.length ? 'var(--company)' : 'var(--border)'

  return (
    <>
      {/* HEADER */}
      <header className="app-header">
        <div className="logo" onClick={() => navigate('/')}>VisualScript <span>— Smart Transcription</span></div>
        <nav className="nav-pills">
          {SECTIONS.map(s => (
            <button key={s} className={`nav-pill${activeNav === s ? ' active' : ''}`} onClick={() => scrollToSection(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      {/* HERO + TRANSCRIPT */}
      <div className="section" id="transcript" ref={el => sectionRefs.current.transcript = el}>
        <div className="section-label">Call Summary</div>
        <div className="section-title">{title}</div>
        <div className="section-subtitle">A visual breakdown of the uploaded call transcript with {lines.length} dialogue lines and {speakerEntries.length} speakers.</div>

        <div className="stats-bar">
          <div className="stat-card"><div className="stat-value">{lines.length}</div><div className="stat-label">Lines</div></div>
          <div className="stat-card"><div className="stat-value">{graphData.total_words}</div><div className="stat-label">Words</div></div>
          <div className="stat-card"><div className="stat-value">{speakerEntries.length}</div><div className="stat-label">Speakers</div></div>
          <div className="stat-card"><div className="stat-value">{graphData.exchanges}</div><div className="stat-label">Exchanges</div></div>
        </div>

        <div className="transcript-layout">
          <div className="transcript-panel">
            <div className="panel-header"><div className="dot"></div>CALL TRANSCRIPT</div>
            <div className="transcript-body" ref={transcriptRef}>
              {lines.map((line, i) => (
                <div key={i} className={`t-line${i === currentStep ? ' active' : ''}`} data-step={i} onClick={() => setCurrentStep(i)}>
                  <span className={`speaker ${line.role}`}>{line.speaker}</span>
                  {line.timestamp && <span className="timestamp">{line.timestamp}</span>}
                  {line.text}
                </div>
              ))}
            </div>
          </div>

          <div className="visual-panel" style={{ position: 'relative' }}>
            <div className="panel-header"><div className="dot" style={{ background: 'var(--purple)' }}></div>VISUAL BREAKDOWN</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
              <div className="visual-modes">
                {MODES.map((m, i) => (
                  <button key={m.type} className={'vmode-btn' + (currentMode === i ? ' active' : '')} onClick={() => setCurrentMode(i)}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border)' }}>
                <button
                  onClick={() => setChartSource('napkin')}
                  style={{
                    padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    background: chartSource === 'napkin' ? 'linear-gradient(135deg, #a78bfa, #818cf8)' : 'transparent',
                    color: chartSource === 'napkin' ? '#fff' : 'var(--text-dim)',
                    transition: 'all 0.2s',
                  }}
                >
                  Napkin.ai
                </button>
                <button
                  onClick={() => setChartSource('claude')}
                  style={{
                    padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    background: chartSource === 'claude' ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'transparent',
                    color: chartSource === 'claude' ? '#fff' : 'var(--text-dim)',
                    transition: 'all 0.2s',
                  }}
                >
                  Claude AI
                </button>
              </div>
            </div>
            <div className="visual-content" ref={chartExportRef}>
              {(() => {
                const activeCharts = chartSource === 'claude' ? claudeCharts : charts
                const activeLoading = chartSource === 'claude' ? claudeLoadingSet : chartLoadingSet
                const activeErrors = chartSource === 'claude' ? claudeErrors : chartErrors
                const activeProgress = chartSource === 'claude' ? claudeProgress : progress
                const activeRetry = chartSource === 'claude' ? claudeRetryLine : retryLine

                const chart = activeCharts.get(currentStep)
                const isLoading = activeLoading.has(currentStep)
                const error = activeErrors.get(currentStep)

                return (
                  <>
                    <div className="visual-chart-area">
                      {isLoading && <ChartLoading />}
                      {error && !isLoading && <ChartError error={error} onRetry={() => activeRetry(currentStep)} />}
                      {chart && !isLoading && !error && <ChartRouter data={chart} />}
                      {!chart && !isLoading && !error && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" }}>
                          {currentStep >= activeProgress ? 'Generating...' : 'Waiting...'}
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
            {(() => {
              const activeCharts = chartSource === 'claude' ? claudeCharts : charts
              const activeLoading = chartSource === 'claude' ? claudeLoadingSet : chartLoadingSet
              return activeCharts.get(currentStep) && !activeLoading.has(currentStep) && <ChartExportButton targetRef={chartExportRef} filename={(title || 'chart') + '-' + (currentStep + 1)} />
            })()}
          </div>
        </div>
      </div>

      <div className="section-divider"><hr /></div>

      {/* TIMELINE */}
      <div className="section" id="timeline" ref={el => sectionRefs.current.timeline = el}>
        <div className="section-label">Call Timeline</div>
        <div className="section-title">Conversation Flow</div>
        <div className="section-subtitle">Click any moment to jump to that part of the conversation and see the visual breakdown.</div>
        <div className="timeline-track">
          {lines.map((line, i) => (
            <div key={i} className={`timeline-node${i === currentStep ? ' active' : ''}`} onClick={() => timelineJump(i)}>
              <div className="timeline-line"></div>
              <div className="timeline-dot"></div>
              <div className="timeline-label">{line.text.substring(0, 20)}...</div>
              <div className="timeline-time">{line.timestamp || `#${i + 1}`}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider"><hr /></div>

      {/* SPEAKER ANALYTICS */}
      <div className="section" id="speakers" ref={el => sectionRefs.current.speakers = el}>
        <div className="section-label">Speaker Analytics</div>
        <div className="section-title">Who Said What</div>
        <div className="section-subtitle">Breakdown of word count and contribution by each participant.</div>
        <div className="speaker-bars">
          {speakerEntries.map(([name, data]) => (
            <div className="speaker-bar-row" key={name}>
              <div className={`speaker-bar-label ${data.role}`}>{name}</div>
              <div className="speaker-bar-track">
                <div className="speaker-bar-fill" style={{ width: `${data.percentage}%`, background: data.role === 'host' ? 'var(--charity)' : 'var(--company)' }}>
                  {data.percentage}%
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="speaker-stat-grid">
          {speakerEntries.map(([name, data]) => (
            <div className="speaker-stat" key={name}>
              <div className="ss-val" style={{ color: data.role === 'host' ? 'var(--charity)' : 'var(--company)' }}>{data.word_count}</div>
              <div className="ss-label">{name} words</div>
            </div>
          ))}
          <div className="speaker-stat"><div className="ss-val" style={{ color: 'var(--accent)' }}>{graphData.exchanges}</div><div className="ss-label">Q&A exchanges</div></div>
        </div>
      </div>

      <div className="section-divider"><hr /></div>

      {/* KEY CONCEPTS */}
      <div className="section" id="concepts" ref={el => sectionRefs.current.concepts = el}>
        <div className="section-label">Definitions & Context</div>
        <div className="section-title">Key Concepts Explained</div>
        <div className="section-subtitle">Terms and ideas from the call — plus additional context you need to fully understand the model.</div>
        <div className="concepts-grid">
          {sectionsLoading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-dim)', padding: '32px 0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>Analyzing transcript...</div>
          ) : concepts.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-dim)', padding: '32px 0', fontSize: '13px' }}>No concepts extracted</div>
          ) : concepts.map((c, i) => (
            <div className="concept-card" key={i}>
              <div className="concept-icon">{c.icon}</div>
              <div className="concept-term">{c.term}</div>
              <div className="concept-def">{c.def}</div>
              <div className="concept-tag">{c.tag}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider"><hr /></div>

      {/* SUGGESTIONS */}
      <div className="section" id="suggestions" ref={el => sectionRefs.current.suggestions = el}>
        <div className="section-label">Insights & Recommendations</div>
        <div className="section-title">Suggestions for the Product</div>
        <div className="section-subtitle">Actionable ideas surfaced from analyzing the call content.</div>
        <div className="suggestions-list">
          {sectionsLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px 0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>Analyzing transcript...</div>
          ) : suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px 0', fontSize: '13px' }}>No suggestions generated</div>
          ) : suggestions.map((s, i) => (
            <div className="suggestion-item" key={i}>
              <div className="suggestion-number">{String(i + 1).padStart(2, '0')}</div>
              <div className="suggestion-content">
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
                <span className={`suggestion-badge ${s.cls}`}>{s.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider"><hr /></div>

      {/* ACTION ITEMS */}
      <div className="section" id="actions" ref={el => sectionRefs.current.actions = el}>
        <div className="section-label">Follow-Up</div>
        <div className="section-title">Action Items</div>
        <div className="section-subtitle">Tasks extracted from the call that need follow-up.</div>
        <div className="action-items-list">
          {sectionsLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px 0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>Analyzing transcript...</div>
          ) : actionItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px 0', fontSize: '13px' }}>No action items extracted</div>
          ) : actionItems.map((a, i) => (
            <div className="action-item" key={i}>
              <div className={`action-check${actionsDone[i] ? ' done' : ''}`} onClick={() => toggleActionDone(i)}>
                {actionsDone[i] && '✓'}
              </div>
              <div className={`action-text${actionsDone[i] ? ' done' : ''}`}>
                <h4>{a.title}</h4>
                <p>{a.desc}</p>
              </div>
              <span className={`action-priority ${a.cls}`}>{a.priority}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider"><hr /></div>

      {/* QUIZ */}
      <div className="section" id="quiz" ref={el => sectionRefs.current.quiz = el}>
        <div className="section-label">Comprehension Check</div>
        <div className="section-title">Did You Catch Everything?</div>
        <div className="section-subtitle">Test your understanding of the product and business model discussed in the call.</div>

        <div className="quiz-score-bar">
          <div className="quiz-score-ring" style={{ borderColor: scoreColor, color: quizScore === totalAnswered && totalAnswered > 0 ? 'var(--accent)' : 'var(--text)' }}>
            {quizScore}/{totalAnswered || 0}
          </div>
          <div className="quiz-score-info">
            <div className="qsi-title">Your Score</div>
            <div className="qsi-sub">
              {totalAnswered === quizData.length
                ? (quizScore === quizData.length ? 'Perfect score! You understood everything.' : quizScore >= quizData.length - 1 ? 'Great job! Review the one you missed.' : 'Review the transcript and try to understand the model better.')
                : 'Answer all questions to see your result'}
            </div>
          </div>
        </div>

        <div className="quiz-container">
          {sectionsLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px 0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>Generating quiz questions...</div>
          ) : quizData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px 0', fontSize: '13px' }}>No quiz questions generated</div>
          ) : quizData.map((qd, qi) => {
            const answered = quizAnswered[qi]
            return (
              <div className="quiz-card" key={qi}>
                <div className="quiz-number">Question {String(qi + 1).padStart(2, '0')}</div>
                <div className="quiz-question">{qd.q}</div>
                <div className="quiz-options">
                  {qd.opts.map((opt, oi) => {
                    let cls = 'quiz-option'
                    if (answered && answered.oi === oi) cls += ` selected ${answered.correct ? 'correct' : 'wrong'}`
                    return (
                      <div key={oi} className={cls} onClick={() => handleQuizAnswer(qi, oi)}>
                        <div className="option-letter">{String.fromCharCode(65 + oi)}</div>
                        {opt}
                      </div>
                    )
                  })}
                </div>
                {answered && (
                  <div className={`quiz-feedback show ${answered.correct ? 'correct' : 'wrong'}`}>
                    {answered.correct ? qd.fb.correct : qd.fb.wrong}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="section-divider"><hr /></div>

      {/* ASK */}
      <div className="section" id="ask" ref={el => sectionRefs.current.ask = el}>
        <div className="section-label">Interactive Q&A</div>
        <div className="section-title">Ask a Question</div>
        <div className="section-subtitle">Anything unclear from the call? Ask below and get an instant answer based on the transcript.</div>
        <div className="ask-container">
          <div className="ask-input-area">
            <input
              className="ask-input"
              type="text"
              placeholder="e.g. Can the user set a monthly donation cap?"
              value={askInput}
              onChange={e => setAskInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') askQuestion() }}
            />
            <button className="ask-btn" onClick={() => askQuestion()}>Ask</button>
          </div>
          <div className="suggested-questions">
            {suggestedQs.length > 0 && suggestedQs.map(q => (
              <button key={q} className="sq-chip" onClick={() => askQuestion(q)}>{q}</button>
            ))}
          </div>
          <div className="ask-threads">
            {threads.map((t, i) => (
              <div className="thread-item" key={i}>
                <div className={`thread-avatar ${t.type}`}>{t.type === 'user' ? '👤' : '⚡'}</div>
                <div className="thread-content">
                  <div className={`thread-name ${t.type}`}>{t.type === 'user' ? 'You' : 'VisualScript AI'}</div>
                  <div className="thread-text">{t.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 100 }}></div>
    </>
  )
}
