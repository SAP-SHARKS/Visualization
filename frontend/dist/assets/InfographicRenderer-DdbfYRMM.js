import{r as l,j as t}from"./index-wQW5iGBW.js";/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=(...o)=>o.filter((e,r,n)=>!!e&&e.trim()!==""&&n.indexOf(e)===r).join(" ").trim();/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=o=>o.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=o=>o.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,r,n)=>n?n.toUpperCase():r.toLowerCase());/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=o=>{const e=v(o);return e.charAt(0).toUpperCase()+e.slice(1)};/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var w={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=o=>{for(const e in o)if(e.startsWith("aria-")||e==="role"||e==="title")return!0;return!1};/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=l.forwardRef(({color:o="currentColor",size:e=24,strokeWidth:r=2,absoluteStrokeWidth:n,className:d="",children:c,iconNode:a,...s},f)=>l.createElement("svg",{ref:f,...w,width:e,height:e,stroke:o,strokeWidth:n?Number(r)*24/Number(e):r,className:m("lucide",d),...!c&&!N(s)&&{"aria-hidden":"true"},...s},[...a.map(([h,g])=>l.createElement(h,g)),...Array.isArray(c)?c:[c]]));/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=(o,e)=>{const r=l.forwardRef(({className:n,...d},c)=>l.createElement(_,{ref:c,iconNode:e,className:m(`lucide-${k(p(o))}`,`lucide-${o}`,n),...d}));return r.displayName=p(o),r};/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],x=i("chart-column",C);/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]],M=i("clock",j);/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]],S=i("globe",z);/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}]],A=i("heart",$);/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=[["path",{d:"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",key:"qeys4"}],["path",{d:"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09",key:"u4xsad"}],["path",{d:"M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z",key:"676m9"}],["path",{d:"M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05",key:"92ym6u"}]],L=i("rocket",I);/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]],E=i("shield",R);/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]],F=i("star",O);/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],q=i("target",U);/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],H=i("users",B);/**
 * @license lucide-react v0.576.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],V=i("zap",P),Z={chart:x,users:H,globe:S,rocket:L,shield:E,zap:V,heart:A,star:F,target:q,clock:M},b=[{bg:"rgba(61,214,140,0.12)",color:"#3dd68c"},{bg:"rgba(96,165,250,0.12)",color:"#60a5fa"},{bg:"rgba(245,158,11,0.12)",color:"#f59e0b"},{bg:"rgba(167,139,250,0.12)",color:"#a78bfa"},{bg:"rgba(239,68,68,0.12)",color:"#ef4444"},{bg:"rgba(91,245,220,0.12)",color:"#5bf5dc"}],D=`
.infog-container{width:100%;padding:8px 0;}
.infog-header{text-align:center;margin-bottom:28px;}
.infog-title{font-family:'DM Serif Display',serif;font-size:26px;background:linear-gradient(135deg,#e8eaf0 30%,#8a90a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;}
.infog-subtitle{font-size:15px;color:#9ca3af;max-width:400px;margin:0 auto;}
.infog-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}
.infog-card{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:22px;transition:all .3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;}
.infog-card.infog-enter{animation:infogScaleIn .5s cubic-bezier(0.16,1,0.3,1) forwards;}
@keyframes infogScaleIn{from{opacity:0;transform:scale(0.9);}to{opacity:1;transform:scale(1);}}
.infog-card.infog-flash{animation:infogFlash .6s ease;}
@keyframes infogFlash{0%{box-shadow:inset 0 0 0 2px rgba(61,214,140,0.4);}100%{box-shadow:none;}}
.infog-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;opacity:0;transition:opacity .3s;}
.infog-card:hover{border-color:rgba(61,214,140,0.2);transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.3);}
.infog-card:hover::before{opacity:1;}
.infog-icon{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;}
.infog-value{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px;line-height:1.2;}
.infog-heading{font-size:15px;font-weight:600;color:#e8eaf0;margin-bottom:4px;}
.infog-desc{font-size:13px;color:#9ca3af;line-height:1.5;}
.infog-footer{text-align:center;margin-top:24px;font-size:14px;color:#4a5060;font-style:italic;padding-top:16px;border-top:1px solid rgba(255,255,255,0.04);}
@media(max-width:500px){
  .infog-grid{grid-template-columns:1fr;}
  .infog-value{font-size:22px;}
}
[data-theme="light"] .infog-title{background:linear-gradient(135deg,#0f172a 30%,#6366f1);-webkit-background-clip:text;}
[data-theme="light"] .infog-subtitle{color:#64748b;}
[data-theme="light"] .infog-card{background:linear-gradient(135deg,#ffffff,#f8fafc);border-color:rgba(99,102,241,0.1);box-shadow:0 1px 3px rgba(0,0,0,0.04);}
[data-theme="light"] .infog-card:hover{border-color:rgba(99,102,241,0.3);box-shadow:0 8px 24px rgba(99,102,241,0.1);}
[data-theme="light"] .infog-value{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;}
[data-theme="light"] .infog-heading{color:#0f172a;}
[data-theme="light"] .infog-desc{color:#64748b;}
[data-theme="light"] .infog-footer{color:#64748b;border-top-color:rgba(99,102,241,0.08);}
`;function K({data:o}){const e=o.sections||[],r=l.useRef({headings:new Set,values:{}}),n=r.current,d=new Set,c=new Set;return e.forEach(a=>{const s=a.heading;n.headings.has(s)?n.values[s]!==a.value&&c.add(s):d.add(s)}),l.useEffect(()=>{r.current={headings:new Set(e.map(a=>a.heading)),values:Object.fromEntries(e.map(a=>[a.heading,a.value]))}},[e]),t.jsxs(t.Fragment,{children:[t.jsx("style",{children:D}),t.jsxs("div",{className:"infog-container",children:[t.jsxs("div",{className:"infog-header",children:[t.jsx("div",{className:"infog-title",children:o.title}),o.subtitle&&t.jsx("div",{className:"infog-subtitle",children:o.subtitle})]}),t.jsx("div",{className:"infog-grid",children:e.map((a,s)=>{const f=(a.icon||"chart").toLowerCase(),h=Z[f]||x,g=b[s%b.length],u=d.has(a.heading),y=c.has(a.heading);return t.jsxs("div",{className:`infog-card${u?" infog-enter":y?" infog-flash":""}`,style:{"--card-color":g.color},children:[t.jsx("div",{style:{position:"absolute",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg, transparent, ${g.color}, transparent)`},className:"infog-card-line"}),t.jsx("div",{className:"infog-icon",style:{background:g.bg},children:t.jsx(h,{size:20,color:g.color})}),t.jsx("div",{className:"infog-value",children:a.value}),t.jsx("div",{className:"infog-heading",children:a.heading}),t.jsx("div",{className:"infog-desc",children:a.description})]},a.heading)})}),o.footer&&t.jsx("div",{className:"infog-footer",children:o.footer})]})]})}const G=l.memo(K);export{G as default};
