import{r as o,j as e}from"./index-wQW5iGBW.js";const c=`
.tl-container{position:relative;padding:20px 0;}
.tl-line{position:absolute;left:50%;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,transparent,rgba(61,214,140,0.3),rgba(61,214,140,0.3),transparent);transform:translateX(-50%);}
.tl-event{display:flex;align-items:flex-start;margin-bottom:32px;position:relative;opacity:1;transition:opacity 0.3s;}
.tl-event:nth-child(odd){flex-direction:row;}
.tl-event:nth-child(even){flex-direction:row-reverse;}
.tl-event.tl-enter{animation:tlSlideIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards;}
@keyframes tlSlideIn{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}
.tl-card{width:calc(50% - 32px);background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;}
.tl-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#3dd68c,transparent);opacity:0;transition:opacity .3s;}
.tl-card:hover{border-color:rgba(61,214,140,0.25);transform:translateY(-2px);box-shadow:0 8px 24px rgba(61,214,140,0.06);}
.tl-card:hover::before{opacity:1;}
.tl-dot{position:absolute;left:50%;top:28px;width:14px;height:14px;border-radius:50%;background:#3dd68c;border:3px solid #06080c;transform:translateX(-50%);z-index:2;box-shadow:0 0 12px rgba(61,214,140,0.3);}
.tl-date{font-family:'JetBrains Mono',monospace;font-size:13px;color:#3dd68c;letter-spacing:1px;margin-bottom:6px;font-weight:600;}
.tl-title{font-size:17px;font-weight:600;color:#e8eaf0;margin-bottom:6px;}
.tl-desc{font-size:14px;color:#9ca3af;line-height:1.6;}
.tl-icon{font-size:24px;margin-bottom:8px;}
.tl-highlight{animation:tlHighlight 0.8s ease;}
@keyframes tlHighlight{0%{box-shadow:0 0 0 0 rgba(61,214,140,0.4);}50%{box-shadow:0 0 0 6px rgba(61,214,140,0.15);}100%{box-shadow:none;}}
@media(max-width:600px){
  .tl-line{left:20px;}
  .tl-event,.tl-event:nth-child(even){flex-direction:row!important;}
  .tl-card{width:calc(100% - 48px);margin-left:40px;}
  .tl-dot{left:20px;top:20px;}
}
[data-theme="light"] .tl-line{background:linear-gradient(to bottom,transparent,rgba(99,102,241,0.3),rgba(99,102,241,0.3),transparent);}
[data-theme="light"] .tl-card{background:linear-gradient(135deg,#ffffff,#f8fafc);border-color:rgba(99,102,241,0.1);box-shadow:0 1px 3px rgba(0,0,0,0.04);}
[data-theme="light"] .tl-card::before{background:linear-gradient(90deg,transparent,#6366f1,transparent);}
[data-theme="light"] .tl-card:hover{border-color:rgba(99,102,241,0.3);box-shadow:0 8px 24px rgba(99,102,241,0.1);}
[data-theme="light"] .tl-dot{background:#6366f1;border-color:#ffffff;box-shadow:0 0 12px rgba(99,102,241,0.35);}
[data-theme="light"] .tl-date{color:#6366f1;}
[data-theme="light"] .tl-title{color:#0f172a;}
[data-theme="light"] .tl-desc{color:#64748b;}
`;function p({data:l}){const r=l.events||[],d=o.useRef(0),n=o.useRef(new Set),s=n.current,i=new Set;return r.forEach((t,a)=>{s.has(t.title+"|"+t.date)||i.add(a)}),o.useEffect(()=>{const t=new Set(r.map(a=>a.title+"|"+a.date));n.current=t,d.current=r.length},[r]),e.jsxs(e.Fragment,{children:[e.jsx("style",{children:c}),e.jsxs("div",{className:"tl-container",style:{width:"100%"},children:[e.jsx("div",{className:"tl-line"}),r.map((t,a)=>e.jsxs("div",{className:`tl-event${i.has(a)?" tl-enter":""}`,children:[e.jsxs("div",{className:`tl-card${i.has(a)?"":" tl-highlight"}`,children:[t.icon&&e.jsx("div",{className:"tl-icon",children:t.icon}),e.jsx("div",{className:"tl-date",children:t.date}),e.jsx("div",{className:"tl-title",children:t.title}),e.jsx("div",{className:"tl-desc",children:t.description})]}),e.jsx("div",{className:"tl-dot"})]},t.title+"|"+t.date))]})]})}const g=o.memo(p);export{g as default};
