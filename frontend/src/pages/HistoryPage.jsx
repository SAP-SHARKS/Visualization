import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listSessions } from '../services/sessionStorage'

const HISTORY_CSS = `
.history-page {
  min-height: 100vh;
  background: #06080c;
  font-family: 'DM Sans', sans-serif;
  color: #e8eaf0;
  position: relative;
}
.history-page::before {
  content: '';
  position: fixed;
  top: -40%;
  left: -20%;
  width: 80%;
  height: 80%;
  background: radial-gradient(circle, rgba(61,214,140,0.04) 0%, transparent 65%);
  pointer-events: none;
}
.history-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(6,8,12,0.85);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 14px 40px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.history-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(61,214,140,0.15), transparent);
}
.history-header .logo {
  font-family: 'DM Serif Display', serif;
  font-size: 20px;
  background: linear-gradient(135deg, #3dd68c, #5bf5dc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
  text-decoration: none;
}
.history-header .logo-sub {
  color: #5a6070;
  font-size: 12px;
  font-family: 'DM Sans', sans-serif;
  margin-left: 10px;
  -webkit-text-fill-color: #5a6070;
}
.history-nav-links {
  margin-left: auto;
  display: flex;
  gap: 10px;
  align-items: center;
}
.history-nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  font-size: 12px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  text-decoration: none;
  color: #e8eaf0;
  background: rgba(255,255,255,0.04);
  transition: all 0.25s;
}
.history-nav-link:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.12);
  transform: translateY(-1px);
}
.go-live-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 20px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  text-decoration: none;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  box-shadow: 0 2px 12px rgba(239,68,68,0.25);
  transition: all 0.25s;
}
.go-live-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(239,68,68,0.4);
}
.go-live-btn .live-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #fff;
  animation: dotBlink 1.2s infinite;
}
@keyframes dotBlink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
.history-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 40px;
  position: relative;
  z-index: 1;
}
.history-title {
  font-family: 'DM Serif Display', serif;
  font-size: 36px;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #e8eaf0 30%, #8a90a0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.history-subtitle {
  color: #6b7280;
  font-size: 15px;
  margin-bottom: 36px;
}
.history-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.session-card {
  background: rgba(14,17,23,0.8);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  text-decoration: none;
  color: inherit;
  position: relative;
  overflow: hidden;
}
.session-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent, #3dd68c), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}
.session-card:hover {
  border-color: rgba(61,214,140,0.2);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.session-card:hover::before { opacity: 1; }
.session-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(61,214,140,0.12), rgba(91,156,245,0.12));
  border: 1px solid rgba(61,214,140,0.15);
}
.session-icon.live {
  background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.12));
  border-color: rgba(239,68,68,0.15);
}
.session-info {
  flex: 1;
  min-width: 0;
}
.session-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8eaf0;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
  font-family: 'JetBrains Mono', monospace;
}
.session-badge {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.session-badge.upload {
  background: rgba(61,214,140,0.12);
  color: #3dd68c;
  border: 1px solid rgba(61,214,140,0.2);
}
.session-badge.live {
  background: rgba(239,68,68,0.12);
  color: #ef4444;
  border: 1px solid rgba(239,68,68,0.2);
}
.session-arrow {
  color: #4a5060;
  font-size: 18px;
  transition: transform 0.2s;
}
.session-card:hover .session-arrow {
  color: #3dd68c;
  transform: translateX(4px);
}
.history-loading {
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
}
.history-loading .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.08);
  border-top-color: #3dd68c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.history-empty {
  text-align: center;
  padding: 80px 20px;
}
.history-empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}
.history-empty-text {
  color: #6b7280;
  font-size: 16px;
  margin-bottom: 8px;
}
.history-empty-hint {
  color: #4a5060;
  font-size: 13px;
}
.history-error {
  background: rgba(245,91,91,0.08);
  border: 1px solid rgba(245,91,91,0.2);
  color: #f55b5b;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 13px;
}

/* Light mode */
[data-theme="light"] .history-page { background: #f8f9fc; color: #1e1b4b; }
[data-theme="light"] .history-page::before {
  background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%);
}
[data-theme="light"] .history-header {
  background: rgba(255,255,255,0.92);
  border-bottom-color: rgba(99,102,241,0.08);
}
[data-theme="light"] .history-header::after {
  background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
}
[data-theme="light"] .history-header .logo {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
}
[data-theme="light"] .history-header .logo-sub {
  color: #8b5cf6; -webkit-text-fill-color: #8b5cf6;
}
[data-theme="light"] .history-nav-link {
  color: #1e1b4b;
  border-color: rgba(99,102,241,0.12);
  background: rgba(99,102,241,0.04);
}
[data-theme="light"] .history-nav-link:hover {
  background: rgba(99,102,241,0.08);
  border-color: rgba(99,102,241,0.2);
}
[data-theme="light"] .go-live-btn {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
}
[data-theme="light"] .history-title {
  background: linear-gradient(135deg, #1e1b4b 30%, #6366f1);
  -webkit-background-clip: text;
}
[data-theme="light"] .history-subtitle { color: #6b7280; }
[data-theme="light"] .session-card {
  background: #ffffff;
  border-color: rgba(99,102,241,0.08);
}
[data-theme="light"] .session-card:hover {
  border-color: rgba(99,102,241,0.2);
  box-shadow: 0 8px 32px rgba(99,102,241,0.1);
}
[data-theme="light"] .session-card::before {
  background: linear-gradient(90deg, transparent, #6366f1, transparent);
}
[data-theme="light"] .session-icon {
  background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1));
  border-color: rgba(99,102,241,0.15);
}
[data-theme="light"] .session-icon.live {
  background: linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.08));
  border-color: rgba(239,68,68,0.12);
}
[data-theme="light"] .session-title { color: #1e1b4b; }
[data-theme="light"] .session-meta { color: #6b7280; }
[data-theme="light"] .session-badge.upload {
  background: rgba(99,102,241,0.08);
  color: #6366f1;
  border-color: rgba(99,102,241,0.15);
}
[data-theme="light"] .session-arrow { color: #a5b4fc; }
[data-theme="light"] .session-card:hover .session-arrow { color: #6366f1; }
`

export default function HistoryPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const id = 'history-page-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = HISTORY_CSS
      document.head.appendChild(style)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  useEffect(() => {
    listSessions().then(({ sessions: data, error: err }) => {
      if (err) setError(err)
      else setSessions(data || [])
      setLoading(false)
    })
  }, [])

  function formatDate(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="history-page">
      <header className="history-header">
        <Link to="/" className="logo">VisualScript <span className="logo-sub">Smart Transcription</span></Link>
        <div className="history-nav-links">
          <Link to="/" className="history-nav-link">Upload</Link>
          <Link to="/live" className="go-live-btn">
            <span className="live-dot" />
            Go Live
          </Link>
        </div>
      </header>

      <div className="history-content">
        <h1 className="history-title">History</h1>
        <p className="history-subtitle">Review your previously generated visualizations</p>

        {loading && (
          <div className="history-loading">
            <div className="spinner" />
            Loading sessions...
          </div>
        )}

        {error && <div className="history-error">{error}</div>}

        {!loading && !error && sessions.length === 0 && (
          <div className="history-empty">
            <div className="history-empty-icon">📭</div>
            <div className="history-empty-text">No sessions yet</div>
            <div className="history-empty-hint">Upload a transcript or start a live session to get started</div>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="history-grid">
            {sessions.map(s => (
              <Link key={s.id} to={`/visualize?session=${s.id}`} className="session-card">
                <div className={`session-icon ${s.mode === 'live' ? 'live' : ''}`}>
                  {s.mode === 'live' ? '🎙️' : '📄'}
                </div>
                <div className="session-info">
                  <div className="session-title">{s.title || 'Untitled Session'}</div>
                  <div className="session-meta">
                    <span className={`session-badge ${s.mode}`}>{s.mode}</span>
                    <span>{s.word_count?.toLocaleString() || 0} words</span>
                    <span>{formatDate(s.created_at)}</span>
                  </div>
                </div>
                <span className="session-arrow">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
