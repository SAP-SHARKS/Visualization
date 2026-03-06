import { memo } from 'react'

const TIMELINE_CSS = `
.tl-container{position:relative;padding:20px 0;}
.tl-line{position:absolute;left:50%;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,transparent,rgba(61,214,140,0.3),rgba(61,214,140,0.3),transparent);transform:translateX(-50%);}
.tl-event{display:flex;align-items:flex-start;margin-bottom:32px;position:relative;opacity:0;animation:tlFadeIn 0.5s ease forwards;}
.tl-event:nth-child(odd){flex-direction:row;}
.tl-event:nth-child(even){flex-direction:row-reverse;}
.tl-event:nth-child(1){animation-delay:0.1s;}
.tl-event:nth-child(2){animation-delay:0.2s;}
.tl-event:nth-child(3){animation-delay:0.3s;}
.tl-event:nth-child(4){animation-delay:0.4s;}
.tl-event:nth-child(5){animation-delay:0.5s;}
.tl-event:nth-child(6){animation-delay:0.6s;}
.tl-event:nth-child(7){animation-delay:0.7s;}
.tl-event:nth-child(8){animation-delay:0.8s;}
@keyframes tlFadeIn{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
.tl-card{width:calc(50% - 32px);background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;}
.tl-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#3dd68c,transparent);opacity:0;transition:opacity .3s;}
.tl-card:hover{border-color:rgba(61,214,140,0.25);transform:translateY(-2px);box-shadow:0 8px 24px rgba(61,214,140,0.06);}
.tl-card:hover::before{opacity:1;}
.tl-dot{position:absolute;left:50%;top:28px;width:14px;height:14px;border-radius:50%;background:#3dd68c;border:3px solid #06080c;transform:translateX(-50%);z-index:2;box-shadow:0 0 12px rgba(61,214,140,0.3);}
.tl-date{font-family:'JetBrains Mono',monospace;font-size:11px;color:#3dd68c;letter-spacing:1px;margin-bottom:6px;font-weight:600;}
.tl-title{font-size:15px;font-weight:600;color:#e8eaf0;margin-bottom:4px;}
.tl-desc{font-size:12px;color:#6b7280;line-height:1.6;}
.tl-icon{font-size:20px;margin-bottom:8px;}
@media(max-width:600px){
  .tl-line{left:20px;}
  .tl-event,.tl-event:nth-child(even){flex-direction:row!important;}
  .tl-card{width:calc(100% - 48px);margin-left:40px;}
  .tl-dot{left:20px;top:20px;}
}
[data-theme="light"] .tl-line{background:linear-gradient(to bottom,transparent,rgba(53,88,114,0.25),rgba(53,88,114,0.25),transparent);}
[data-theme="light"] .tl-card{background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(238,241,232,0.95));border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .tl-card::before{background:linear-gradient(90deg,transparent,#7AAACE,transparent);}
[data-theme="light"] .tl-card:hover{border-color:rgba(53,88,114,0.2);box-shadow:0 8px 24px rgba(53,88,114,0.06);}
[data-theme="light"] .tl-dot{background:#355872;border-color:#F7F8F0;box-shadow:0 0 12px rgba(53,88,114,0.2);}
[data-theme="light"] .tl-date{color:#355872;}
[data-theme="light"] .tl-title{color:#1a2d3d;}
[data-theme="light"] .tl-desc{color:#7AAACE;}
`

function TimelineRenderer({ data }) {
  const events = data.events || []

  return (
    <>
      <style>{TIMELINE_CSS}</style>
      <div className="tl-container" style={{ width: '100%' }}>
        <div className="tl-line"></div>
        {events.map((event, i) => (
          <div className="tl-event" key={i}>
            <div className="tl-card">
              {event.icon && <div className="tl-icon">{event.icon}</div>}
              <div className="tl-date">{event.date}</div>
              <div className="tl-title">{event.title}</div>
              <div className="tl-desc">{event.description}</div>
            </div>
            <div className="tl-dot"></div>
          </div>
        ))}
      </div>
    </>
  )
}

export default memo(TimelineRenderer)
