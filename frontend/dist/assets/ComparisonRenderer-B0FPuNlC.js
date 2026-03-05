import{b as i,j as e}from"./index-dpbyM5Yg.js";const l=`
.cmp-grid{display:grid;gap:20px;width:100%;}
.cmp-grid.cols-2{grid-template-columns:1fr 1fr;}
.cmp-grid.cols-3{grid-template-columns:1fr 1fr 1fr;}
.cmp-grid.cols-4{grid-template-columns:1fr 1fr 1fr 1fr;}
.cmp-card{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:24px;transition:all .3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;opacity:0;animation:cmpFadeIn .5s ease forwards;}
.cmp-card:nth-child(1){animation-delay:0.1s;}
.cmp-card:nth-child(2){animation-delay:0.2s;}
.cmp-card:nth-child(3){animation-delay:0.3s;}
.cmp-card:nth-child(4){animation-delay:0.4s;}
@keyframes cmpFadeIn{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
.cmp-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;opacity:0;transition:opacity .3s;}
.cmp-card:nth-child(1)::before{background:linear-gradient(90deg,#3dd68c,#5bf5dc);}
.cmp-card:nth-child(2)::before{background:linear-gradient(90deg,#60a5fa,#93c5fd);}
.cmp-card:nth-child(3)::before{background:linear-gradient(90deg,#f59e0b,#fbbf24);}
.cmp-card:nth-child(4)::before{background:linear-gradient(90deg,#a78bfa,#c4b5fd);}
.cmp-card:hover{border-color:rgba(61,214,140,0.2);transform:translateY(-3px);box-shadow:0 8px 32px rgba(0,0,0,0.3);}
.cmp-card:hover::before{opacity:1;}
.cmp-name{font-size:18px;font-weight:700;margin-bottom:6px;color:#e8eaf0;}
.cmp-desc{font-size:12px;color:#6b7280;line-height:1.6;margin-bottom:16px;}
.cmp-section-label{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;font-weight:600;}
.cmp-section-label.pros{color:#3dd68c;}
.cmp-section-label.cons{color:#ef4444;}
.cmp-list{list-style:none;padding:0;margin:0 0 16px;}
.cmp-list li{font-size:12px;color:#9ca3af;padding:4px 0 4px 16px;position:relative;line-height:1.5;}
.cmp-list.pros li::before{content:'\\2713';position:absolute;left:0;color:#3dd68c;font-weight:700;font-size:11px;}
.cmp-list.cons li::before{content:'\\2717';position:absolute;left:0;color:#ef4444;font-weight:700;font-size:11px;}
.cmp-stats{display:flex;flex-direction:column;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);}
.cmp-stat{display:flex;justify-content:space-between;align-items:center;}
.cmp-stat-label{font-size:11px;color:#6b7280;}
.cmp-stat-value{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
@media(max-width:700px){
  .cmp-grid.cols-3,.cmp-grid.cols-4{grid-template-columns:1fr 1fr;}
}
@media(max-width:500px){
  .cmp-grid.cols-2,.cmp-grid.cols-3,.cmp-grid.cols-4{grid-template-columns:1fr;}
}
`;function p({data:o}){const t=o.items||[],r=t.length<=2?"cols-2":t.length===3?"cols-3":"cols-4";return e.jsxs(e.Fragment,{children:[e.jsx("style",{children:l}),e.jsx("div",{className:`cmp-grid ${r}`,children:t.map((a,n)=>e.jsxs("div",{className:"cmp-card",children:[e.jsx("div",{className:"cmp-name",children:a.name}),a.description&&e.jsx("div",{className:"cmp-desc",children:a.description}),a.pros&&a.pros.length>0&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"cmp-section-label pros",children:"Pros"}),e.jsx("ul",{className:"cmp-list pros",children:a.pros.map((c,s)=>e.jsx("li",{children:c},s))})]}),a.cons&&a.cons.length>0&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"cmp-section-label cons",children:"Cons"}),e.jsx("ul",{className:"cmp-list cons",children:a.cons.map((c,s)=>e.jsx("li",{children:c},s))})]}),a.stats&&a.stats.length>0&&e.jsx("div",{className:"cmp-stats",children:a.stats.map((c,s)=>e.jsxs("div",{className:"cmp-stat",children:[e.jsx("span",{className:"cmp-stat-label",children:c.label}),e.jsx("span",{className:"cmp-stat-value",children:c.value})]},s))})]},n))})]})}const m=i.memo(p);export{m as default};
