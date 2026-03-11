const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/mermaid.core-BjnO6RZG.js","assets/index-wQW5iGBW.js","assets/transform-Y4JL0JD-.js"])))=>i.map(i=>d[i]);
import{r as a,j as r,_ as x}from"./index-wQW5iGBW.js";let g=0,s=null;const b=async()=>(s||(s=(await x(()=>import("./mermaid.core-BjnO6RZG.js").then(e=>e.bp),__vite__mapDeps([0,1,2]))).default),s),f=`
.mermaid-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  padding: 20px;
  overflow: auto;
  transition: opacity 0.4s ease;
}
.mermaid-container svg {
  max-width: 100%;
  height: auto;
}
.mermaid-error {
  color: var(--text-dim);
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  text-align: center;
  padding: 24px;
  background: var(--surface-2);
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-all;
}
.mermaid-fallback-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--accent);
  margin-bottom: 8px;
  font-weight: 600;
}
`;function y({data:o}){const e=a.useRef(null),i=a.useRef(null),[l,c]=a.useState(null),t=(o==null?void 0:o.mermaidCode)||"";return a.useEffect(()=>{if(!t||!e.current)return;(async()=>{try{const n=await b(),d=document.documentElement.getAttribute("data-theme")!=="light";n.initialize({startOnLoad:!1,theme:d?"dark":"default",themeVariables:d?{primaryColor:"rgba(61,214,140,0.2)",primaryBorderColor:"#3dd68c",primaryTextColor:"#e8eaf0",lineColor:"#64748b",secondaryColor:"rgba(96,165,250,0.2)",tertiaryColor:"rgba(245,158,11,0.2)",actorBkg:"rgba(61,214,140,0.15)",actorBorder:"#3dd68c",actorTextColor:"#e8eaf0",signalColor:"#e8eaf0",signalTextColor:"#e8eaf0"}:{primaryColor:"#e0e7ff",primaryBorderColor:"#6366f1",primaryTextColor:"#1e293b",lineColor:"#94a3b8",secondaryColor:"#f0fdf4",tertiaryColor:"#fef3c7",actorBkg:"#e0e7ff",actorBorder:"#6366f1",actorTextColor:"#1e293b",signalColor:"#1e293b",signalTextColor:"#1e293b"},flowchart:{curve:"basis",padding:20},sequence:{mirrorActors:!1,bottomMarginAdj:10}});const u=`mermaid-${Date.now()}-${++g}`,m=i.current&&i.current!==t;m&&e.current&&(e.current.style.opacity="0.3");const{svg:p}=await n.render(u,t);e.current&&(e.current.innerHTML=p,c(null),m&&requestAnimationFrame(()=>{e.current&&(e.current.style.opacity="1")})),i.current=t}catch(n){console.error("Mermaid render error:",n),c(t)}})()},[t]),l?r.jsxs(r.Fragment,{children:[r.jsx("style",{children:f}),r.jsxs("div",{className:"mermaid-error",children:[r.jsx("div",{className:"mermaid-fallback-label",children:"Mermaid Syntax (render failed)"}),l]})]}):r.jsxs(r.Fragment,{children:[r.jsx("style",{children:f}),r.jsx("div",{ref:e,className:"mermaid-container"})]})}const v=a.memo(y);export{v as default};
