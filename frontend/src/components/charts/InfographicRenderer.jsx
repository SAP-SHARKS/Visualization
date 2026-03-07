import { memo } from 'react'
import {
  BarChart3, Users, Globe, Rocket, Shield, Zap, Heart, Star, Target, Clock
} from 'lucide-react'

const ICON_MAP = {
  chart: BarChart3,
  users: Users,
  globe: Globe,
  rocket: Rocket,
  shield: Shield,
  zap: Zap,
  heart: Heart,
  star: Star,
  target: Target,
  clock: Clock,
}

const ICON_COLORS = [
  { bg: 'rgba(61,214,140,0.12)', color: '#3dd68c' },
  { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
  { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  { bg: 'rgba(91,245,220,0.12)', color: '#5bf5dc' },
]

const INFO_CSS = `
.infog-container{width:100%;padding:8px 0;}
.infog-header{text-align:center;margin-bottom:28px;}
.infog-title{font-family:'DM Serif Display',serif;font-size:26px;background:linear-gradient(135deg,#e8eaf0 30%,#8a90a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;}
.infog-subtitle{font-size:15px;color:#6b7280;max-width:400px;margin:0 auto;}
.infog-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}
.infog-card{background:linear-gradient(135deg,rgba(14,17,23,0.9),rgba(21,25,33,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:22px;transition:all .3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;opacity:0;animation:infogFade .5s ease forwards;}
.infog-card:nth-child(1){animation-delay:0.1s;}
.infog-card:nth-child(2){animation-delay:0.15s;}
.infog-card:nth-child(3){animation-delay:0.2s;}
.infog-card:nth-child(4){animation-delay:0.25s;}
.infog-card:nth-child(5){animation-delay:0.3s;}
.infog-card:nth-child(6){animation-delay:0.35s;}
@keyframes infogFade{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
.infog-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;opacity:0;transition:opacity .3s;}
.infog-card:hover{border-color:rgba(61,214,140,0.2);transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.3);}
.infog-card:hover::before{opacity:1;}
.infog-icon{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;}
.infog-value{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px;line-height:1.2;}
.infog-heading{font-size:15px;font-weight:600;color:#e8eaf0;margin-bottom:4px;}
.infog-desc{font-size:13px;color:#6b7280;line-height:1.5;}
.infog-footer{text-align:center;margin-top:24px;font-size:14px;color:#4a5060;font-style:italic;padding-top:16px;border-top:1px solid rgba(255,255,255,0.04);}
@media(max-width:500px){
  .infog-grid{grid-template-columns:1fr;}
  .infog-value{font-size:22px;}
}
[data-theme="light"] .infog-title{background:linear-gradient(135deg,#1a2d3d 30%,#7AAACE);-webkit-background-clip:text;}
[data-theme="light"] .infog-subtitle{color:#7AAACE;}
[data-theme="light"] .infog-card{background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(238,241,232,0.95));border-color:rgba(53,88,114,0.08);}
[data-theme="light"] .infog-card:hover{border-color:rgba(53,88,114,0.2);box-shadow:0 8px 24px rgba(53,88,114,0.06);}
[data-theme="light"] .infog-value{background:linear-gradient(135deg,#355872,#7AAACE);-webkit-background-clip:text;}
[data-theme="light"] .infog-heading{color:#1a2d3d;}
[data-theme="light"] .infog-desc{color:#7AAACE;}
[data-theme="light"] .infog-footer{color:#7AAACE;border-top-color:rgba(53,88,114,0.06);}
`

function InfographicRenderer({ data }) {
  const sections = data.sections || []

  return (
    <>
      <style>{INFO_CSS}</style>
      <div className="infog-container">
        <div className="infog-header">
          <div className="infog-title">{data.title}</div>
          {data.subtitle && <div className="infog-subtitle">{data.subtitle}</div>}
        </div>

        <div className="infog-grid">
          {sections.map((section, i) => {
            const iconKey = (section.icon || 'chart').toLowerCase()
            const IconComponent = ICON_MAP[iconKey] || BarChart3
            const colorScheme = ICON_COLORS[i % ICON_COLORS.length]

            return (
              <div
                className="infog-card"
                key={i}
                style={{ '--card-color': colorScheme.color }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${colorScheme.color}, transparent)` }} className="infog-card-line"></div>
                <div className="infog-icon" style={{ background: colorScheme.bg }}>
                  <IconComponent size={20} color={colorScheme.color} />
                </div>
                <div className="infog-value">{section.value}</div>
                <div className="infog-heading">{section.heading}</div>
                <div className="infog-desc">{section.description}</div>
              </div>
            )
          })}
        </div>

        {data.footer && <div className="infog-footer">{data.footer}</div>}
      </div>
    </>
  )
}

export default memo(InfographicRenderer)
