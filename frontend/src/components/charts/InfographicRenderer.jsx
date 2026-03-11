import { memo, useRef, useEffect } from 'react'
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
`

function InfographicRenderer({ data }) {
  const sections = data.sections || []

  // Track previous sections for diff
  const prevRef = useRef({ headings: new Set(), values: {} })
  const prev = prevRef.current

  const newSections = new Set()
  const updatedSections = new Set()

  sections.forEach((s) => {
    const key = s.heading
    if (!prev.headings.has(key)) {
      newSections.add(key)
    } else if (prev.values[key] !== s.value) {
      updatedSections.add(key)
    }
  })

  useEffect(() => {
    prevRef.current = {
      headings: new Set(sections.map(s => s.heading)),
      values: Object.fromEntries(sections.map(s => [s.heading, s.value])),
    }
  }, [sections])

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
            const isNew = newSections.has(section.heading)
            const isUpdated = updatedSections.has(section.heading)

            return (
              <div
                className={`infog-card${isNew ? ' infog-enter' : isUpdated ? ' infog-flash' : ''}`}
                key={section.heading}
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
