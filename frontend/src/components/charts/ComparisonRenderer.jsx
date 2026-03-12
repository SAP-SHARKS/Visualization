import { memo, useRef, useEffect } from 'react'

const CMP_CSS = `
.cmp-grid{display:grid;gap:20px;width:100%;}
.cmp-grid.cols-2{grid-template-columns:1fr 1fr;}
.cmp-grid.cols-3{grid-template-columns:1fr 1fr 1fr;}
.cmp-grid.cols-4{grid-template-columns:1fr 1fr 1fr 1fr;}
.cmp-card{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:24px;transition:all .3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;}
.cmp-card.cmp-enter{animation:cmpSlideIn .5s cubic-bezier(0.16,1,0.3,1) forwards;}
@keyframes cmpSlideIn{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
.cmp-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;opacity:0;transition:opacity .3s;}
.cmp-card:nth-child(1)::before{background:linear-gradient(90deg,#3dd68c,#5bf5dc);}
.cmp-card:nth-child(2)::before{background:linear-gradient(90deg,#60a5fa,#93c5fd);}
.cmp-card:nth-child(3)::before{background:linear-gradient(90deg,#f59e0b,#fbbf24);}
.cmp-card:nth-child(4)::before{background:linear-gradient(90deg,#a78bfa,#c4b5fd);}
.cmp-card:hover{border-color:rgba(61,214,140,0.2);transform:translateY(-3px);box-shadow:0 8px 32px rgba(0,0,0,0.3);}
.cmp-card:hover::before{opacity:1;}
.cmp-name{font-size:20px;font-weight:700;margin-bottom:8px;color:#e8eaf0;}
.cmp-desc{font-size:14px;color:#9ca3af;line-height:1.6;margin-bottom:16px;}
.cmp-section-label{font-family:'JetBrains Mono',monospace;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;font-weight:600;}
.cmp-section-label.pros{color:#3dd68c;}
.cmp-section-label.cons{color:#ef4444;}
.cmp-list{list-style:none;padding:0;margin:0 0 16px;}
.cmp-list li{font-size:14px;color:#9ca3af;padding:4px 0 4px 18px;position:relative;line-height:1.5;}
.cmp-list li.cmp-li-enter{animation:cmpLiSlide .4s ease forwards;}
@keyframes cmpLiSlide{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:translateX(0);}}
.cmp-list.pros li::before{content:'\\2713';position:absolute;left:0;color:#3dd68c;font-weight:700;font-size:13px;}
.cmp-list.cons li::before{content:'\\2717';position:absolute;left:0;color:#ef4444;font-weight:700;font-size:13px;}
.cmp-stats{display:flex;flex-direction:column;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);}
.cmp-stat{display:flex;justify-content:space-between;align-items:center;}
.cmp-stat-label{font-size:13px;color:#9ca3af;}
.cmp-stat-value{font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.cmp-stat.cmp-stat-flash{animation:cmpFlash .6s ease;}
@keyframes cmpFlash{0%{background:rgba(61,214,140,0.15);border-radius:4px;}100%{background:transparent;}}
@media(max-width:700px){
  .cmp-grid.cols-3,.cmp-grid.cols-4{grid-template-columns:1fr 1fr;}
}
@media(max-width:500px){
  .cmp-grid.cols-2,.cmp-grid.cols-3,.cmp-grid.cols-4{grid-template-columns:1fr;}
}
[data-theme="light"] .cmp-card{background:linear-gradient(135deg,#ffffff,#f8fafc);border-color:rgba(99,102,241,0.1);box-shadow:0 1px 3px rgba(0,0,0,0.04);}
[data-theme="light"] .cmp-card:hover{border-color:rgba(99,102,241,0.3);box-shadow:0 8px 32px rgba(99,102,241,0.1);}
[data-theme="light"] .cmp-name{color:#0f172a;}
[data-theme="light"] .cmp-desc{color:#64748b;}
[data-theme="light"] .cmp-section-label.pros{color:#10b981;}
[data-theme="light"] .cmp-section-label.cons{color:#f43f5e;}
[data-theme="light"] .cmp-list li{color:#475569;}
[data-theme="light"] .cmp-list.pros li::before{color:#10b981;}
[data-theme="light"] .cmp-list.cons li::before{color:#f43f5e;}
[data-theme="light"] .cmp-stats{border-top-color:rgba(99,102,241,0.08);}
[data-theme="light"] .cmp-stat-label{color:#64748b;}
[data-theme="light"] .cmp-stat-value{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;}
`

function ComparisonRenderer({ data }) {
  const items = data.items || []
  const colClass = items.length <= 2 ? 'cols-2' : items.length === 3 ? 'cols-3' : 'cols-4'

  // Track previous items for diff animation
  const prevRef = useRef({ names: new Set(), prosMap: {}, consMap: {} })
  const prev = prevRef.current

  const newCards = new Set()
  const newPros = {} // name -> Set of new pro indices
  const newCons = {}

  items.forEach((item) => {
    if (!prev.names.has(item.name)) {
      newCards.add(item.name)
    }
    const prevPros = prev.prosMap[item.name] || []
    const prevCons = prev.consMap[item.name] || []
    const np = new Set()
    const nc = new Set()
    ;(item.pros || []).forEach((p, j) => { if (j >= prevPros.length || prevPros[j] !== p) np.add(j) })
    ;(item.cons || []).forEach((c, j) => { if (j >= prevCons.length || prevCons[j] !== c) nc.add(j) })
    newPros[item.name] = np
    newCons[item.name] = nc
  })

  useEffect(() => {
    prevRef.current = {
      names: new Set(items.map(i => i.name)),
      prosMap: Object.fromEntries(items.map(i => [i.name, [...(i.pros || [])]])),
      consMap: Object.fromEntries(items.map(i => [i.name, [...(i.cons || [])]])),
    }
  }, [items])

  return (
    <>
      <style>{CMP_CSS}</style>
      <div className={`cmp-grid ${colClass}`}>
        {items.map((item, i) => (
          <div className={`cmp-card${newCards.has(item.name) ? ' cmp-enter' : ''}`} key={item.name}>
            <div className="cmp-name">{item.name}</div>
            {item.description && <div className="cmp-desc">{item.description}</div>}

            {item.pros && item.pros.length > 0 && (
              <>
                <div className="cmp-section-label pros">Pros</div>
                <ul className="cmp-list pros">
                  {item.pros.map((p, j) => (
                    <li key={j} className={newPros[item.name]?.has(j) ? 'cmp-li-enter' : ''}>{p}</li>
                  ))}
                </ul>
              </>
            )}

            {item.cons && item.cons.length > 0 && (
              <>
                <div className="cmp-section-label cons">Cons</div>
                <ul className="cmp-list cons">
                  {item.cons.map((c, j) => (
                    <li key={j} className={newCons[item.name]?.has(j) ? 'cmp-li-enter' : ''}>{c}</li>
                  ))}
                </ul>
              </>
            )}

            {item.stats && item.stats.length > 0 && (
              <div className="cmp-stats">
                {item.stats.map((s, j) => (
                  <div className="cmp-stat" key={j}>
                    <span className="cmp-stat-label">{s.label}</span>
                    <span className="cmp-stat-value">{s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

export default memo(ComparisonRenderer)
