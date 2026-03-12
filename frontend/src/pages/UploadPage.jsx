import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import parseDialogue from '../utils/parseDialogue'

const UPLOAD_CSS = `
.upload-page {
  height: 100vh;
  background: #06080c;
  font-family: 'DM Sans', sans-serif;
  color: #e8eaf0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.upload-page::before {
  content: '';
  position: fixed;
  top: -40%;
  left: -20%;
  width: 80%;
  height: 80%;
  background: radial-gradient(circle, rgba(61,214,140,0.06) 0%, transparent 65%);
  pointer-events: none;
}
.upload-page::after {
  content: '';
  position: fixed;
  bottom: -30%;
  right: -20%;
  width: 70%;
  height: 70%;
  background: radial-gradient(circle, rgba(91,156,245,0.05) 0%, transparent 65%);
  pointer-events: none;
}
.upload-header {
  flex-shrink: 0;
  z-index: 100;
  background: rgba(6,8,12,0.8);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 12px 40px;
  display: flex;
  align-items: center;
}
.upload-header .logo {
  font-family: 'DM Serif Display', serif;
  font-size: 20px;
  background: linear-gradient(135deg, #3dd68c, #5bf5dc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}
.upload-header .logo-sub {
  color: #5a6070;
  font-size: 12px;
  font-family: 'DM Sans', sans-serif;
  margin-left: 10px;
  -webkit-text-fill-color: #5a6070;
}
.upload-container {
  max-width: 620px;
  margin: 0 auto;
  padding: 16px 32px 20px;
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
  min-height: 0;
}
.upload-hero {
  text-align: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}
.upload-hero-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(61,214,140,0.15), rgba(91,156,245,0.15));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin: 0 auto 10px;
  border: 1px solid rgba(61,214,140,0.2);
}
.upload-hero h1 {
  font-family: 'DM Serif Display', serif;
  font-size: 28px;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
  background: linear-gradient(135deg, #e8eaf0 30%, #8a90a0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.upload-hero p {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
  max-width: 420px;
  margin: 0 auto;
}
.upload-dropzone {
  border: 2px dashed rgba(61,214,140,0.25);
  border-radius: 14px;
  padding: 10px 14px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  margin-bottom: 10px;
  background: rgba(14,17,22,0.6);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}
.upload-dropzone:hover {
  border-color: rgba(61,214,140,0.5);
  background: rgba(61,214,140,0.04);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(61,214,140,0.08);
}
.upload-dropzone.active {
  border-color: #3dd68c;
  background: rgba(61,214,140,0.06);
  box-shadow: 0 0 40px rgba(61,214,140,0.1);
}
.upload-dropzone .drop-icon {
  font-size: 22px;
  margin-bottom: 2px;
}
.upload-dropzone .drop-text {
  font-size: 12px;
  color: #6b7280;
}
.upload-dropzone .drop-text strong {
  color: #3dd68c;
}
.upload-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  flex-shrink: 0;
}
.upload-divider span {
  font-size: 10px;
  color: #4a5060;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-family: 'JetBrains Mono', monospace;
}
.upload-divider::before,
.upload-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
}
.upload-form-group {
  margin-bottom: 10px;
  flex-shrink: 0;
}
.upload-form-group.grow {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex-shrink: 1;
}
.upload-form-group label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 6px;
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}
.upload-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(14,17,22,0.8);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  color: #e8eaf0;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}
.upload-input:focus {
  border-color: rgba(61,214,140,0.4);
  box-shadow: 0 0 0 3px rgba(61,214,140,0.08);
}
.upload-input::placeholder { color: #3a4050; }
.upload-textarea {
  width: 100%;
  padding: 12px;
  background: rgba(14,17,22,0.8);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  color: #e8eaf0;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  outline: none;
  min-height: 60px;
  flex: 1;
  resize: none;
  line-height: 1.7;
  box-sizing: border-box;
  transition: all 0.2s;
}
.upload-textarea:focus {
  border-color: rgba(61,214,140,0.4);
  box-shadow: 0 0 0 3px rgba(61,214,140,0.08);
}
.upload-textarea::placeholder { color: #3a4050; }
.upload-submit {
  width: 100%;
  padding: 14px 28px;
  background: linear-gradient(135deg, #3dd68c, #2bc47a);
  color: #06080c;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 10px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  letter-spacing: 0.3px;
}
.upload-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(61,214,140,0.3);
}
.upload-submit:active { transform: translateY(0); }
.upload-error {
  background: rgba(245,91,91,0.08);
  border: 1px solid rgba(245,91,91,0.2);
  color: #f55b5b;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.go-live-btn {
  margin-left: auto;
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
  transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
  animation: livePulse 2.5s ease-in-out infinite;
}
.go-live-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(239,68,68,0.4);
}
.go-live-btn .live-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #fff;
  animation: dotBlink 1.2s infinite;
}
[data-theme="light"] .go-live-btn {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
}
@keyframes livePulse {
  0%,100% { box-shadow: 0 2px 12px rgba(239,68,68,0.25); }
  50% { box-shadow: 0 2px 20px rgba(239,68,68,0.45); }
}
@keyframes dotBlink {
  0%,100% { opacity:1; } 50% { opacity:0.3; }
}
@media(max-width:640px) {
  .upload-header { padding: 10px 16px; }
  .upload-container { padding: 12px 16px 16px; }
  .upload-hero h1 { font-size: 24px; }
  .upload-hero p { font-size: 12px; }
  .upload-hero { margin-bottom: 10px; }
  .upload-hero-icon { width: 36px; height: 36px; font-size: 18px; margin-bottom: 8px; }
  .upload-dropzone { padding: 14px 12px; margin-bottom: 10px; }
  .upload-dropzone .drop-icon { font-size: 24px; margin-bottom: 4px; }
  .upload-dropzone .drop-text { font-size: 12px; }
  .upload-divider { margin-bottom: 10px; }
  .upload-submit { padding: 12px 24px; font-size: 13px; }
}

[data-theme="light"] .upload-page {
  background: #F7F8F0;
  color: #1a2d3d;
}
[data-theme="light"] .upload-page::before {
  background: radial-gradient(circle, rgba(156,213,255,0.12) 0%, transparent 65%);
}
[data-theme="light"] .upload-page::after {
  background: radial-gradient(circle, rgba(122,170,206,0.1) 0%, transparent 65%);
}
[data-theme="light"] .upload-header {
  background: rgba(255,255,255,0.92);
  border-bottom-color: rgba(53,88,114,0.1);
}
[data-theme="light"] .upload-header .logo {
  background: linear-gradient(135deg, #355872, #7AAACE);
  -webkit-background-clip: text;
}
[data-theme="light"] .upload-header .logo-sub {
  color: #7AAACE;
  -webkit-text-fill-color: #7AAACE;
}
[data-theme="light"] .upload-hero h1 {
  background: linear-gradient(135deg, #1a2d3d 30%, #7AAACE);
  -webkit-background-clip: text;
}
[data-theme="light"] .upload-hero p {
  color: #7AAACE;
}
[data-theme="light"] .upload-hero-icon {
  background: linear-gradient(135deg, rgba(53,88,114,0.1), rgba(122,170,206,0.1));
  border-color: rgba(53,88,114,0.15);
}
[data-theme="light"] .upload-dropzone {
  border-color: rgba(53,88,114,0.25);
  background: rgba(255,255,255,0.7);
}
[data-theme="light"] .upload-dropzone:hover {
  border-color: rgba(53,88,114,0.5);
  background: rgba(156,213,255,0.08);
  box-shadow: 0 8px 32px rgba(53,88,114,0.1);
}
[data-theme="light"] .upload-dropzone.active {
  border-color: #355872;
  background: rgba(156,213,255,0.1);
}
[data-theme="light"] .upload-dropzone .drop-text {
  color: #7AAACE;
}
[data-theme="light"] .upload-dropzone .drop-text strong {
  color: #1a2d3d;
}
[data-theme="light"] .upload-divider span {
  color: #7AAACE;
}
[data-theme="light"] .upload-divider::before,
[data-theme="light"] .upload-divider::after {
  background: linear-gradient(90deg, transparent, rgba(53,88,114,0.15), transparent);
}
[data-theme="light"] .upload-form-group label {
  color: #7AAACE;
}
[data-theme="light"] .upload-input {
  background: rgba(255,255,255,0.8);
  border-color: rgba(53,88,114,0.12);
  color: #1a2d3d;
}
[data-theme="light"] .upload-input:focus {
  border-color: rgba(53,88,114,0.4);
  box-shadow: 0 0 0 3px rgba(53,88,114,0.08);
}
[data-theme="light"] .upload-input::placeholder { color: #9CD5FF; }
[data-theme="light"] .upload-textarea {
  background: rgba(255,255,255,0.8);
  border-color: rgba(53,88,114,0.12);
  color: #1a2d3d;
}
[data-theme="light"] .upload-textarea:focus {
  border-color: rgba(53,88,114,0.4);
  box-shadow: 0 0 0 3px rgba(53,88,114,0.08);
}
[data-theme="light"] .upload-textarea::placeholder { color: #9CD5FF; }
[data-theme="light"] .upload-submit {
  background: linear-gradient(135deg, #355872, #7AAACE);
  color: #F7F8F0;
}
[data-theme="light"] .upload-submit:hover {
  box-shadow: 0 8px 32px rgba(53,88,114,0.3);
}
[data-theme="light"] .upload-submit.canvas-btn {
  background: linear-gradient(135deg, #5b6abf, #7c6df5);
}
[data-theme="light"] .upload-error {
  background: rgba(239,68,68,0.06);
  border-color: rgba(239,68,68,0.2);
  color: #dc2626;
}
`

export default function UploadPage() {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const id = 'upload-page-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = UPLOAD_CSS
      document.head.appendChild(style)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setContent(e.target.result)
    }
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!content.trim()) {
      setError('Transcript is required')
      return
    }
    const data = parseDialogue(content.trim())
    navigate('/visualize', { state: { content: content.trim(), graphData: data } })
  }

  function handleCanvasView() {
    setError('')
    if (!content.trim()) {
      setError('Transcript is required')
      return
    }
    navigate('/visualize2', { state: { content: content.trim() } })
  }

  return (
    <div className="upload-page">
      <header className="upload-header">
        <div className="logo">VisualScript <span className="logo-sub">Smart Transcription</span></div>
        <Link to="/history" className="go-live-btn" style={{ background: 'rgba(255,255,255,0.06)', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#e8eaf0', animation: 'none', marginLeft: 'auto' }}>
          History
        </Link>
        <Link to="/live" className="go-live-btn" style={{ marginLeft: 0 }}>
          <span className="live-dot" />
          Go Live
        </Link>
      </header>

      <div className="upload-container">
        <div className="upload-hero">
          <div className="upload-hero-icon">🎙️</div>
          <h1>Visualize Any Call</h1>
          <p>Paste your transcript or drop a file — get instant flowcharts, infographics, and insights.</p>
        </div>

        <div
          className={`upload-dropzone${dragOver ? ' active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="drop-icon">{dragOver ? '📂' : '📄'}</div>
          <div className="drop-text">
            {dragOver ? 'Drop file here' : <>Drag & drop a .txt file, or <strong>click to browse</strong></>}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.text"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        <div className="upload-divider"><span>or paste below</span></div>

        {error && <div className="upload-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="upload-form-group grow">
            <label>Transcript</label>
            <textarea
              className="upload-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Paste your meeting transcript, call notes, or any text you want to visualize...`}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexShrink: 0, marginTop: '10px' }}>
            <button className="upload-submit" type="submit" style={{ margin: 0, flex: 1 }}>
              Generate Visuals
            </button>
            <button
              className="upload-submit"
              type="button"
              onClick={handleCanvasView}
              style={{ margin: 0, flex: 1, background: 'linear-gradient(135deg, #5b9cf5, #7c6df5)' }}
            >
              Canvas View
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
