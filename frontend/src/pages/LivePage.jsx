import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ChartRouter from '../components/ChartRouter'

// ==================== CSS ====================
const LIVE_CSS = `
:root {
  --bg: #06080c;
  --surface: #0e1117;
  --surface-2: #151921;
  --border: rgba(255,255,255,0.06);
  --text: #e8eaf0;
  --text-dim: #6b7280;
  --accent: #3dd68c;
  --accent-glow: rgba(61,214,140,0.12);
}
[data-theme="light"] {
  --bg: #F7F8F0;
  --surface: #ffffff;
  --surface-2: #eef1e8;
  --border: rgba(53,88,114,0.1);
  --text: #1a2d3d;
  --text-dim: #7AAACE;
  --accent: #355872;
  --accent-glow: rgba(53,88,114,0.1);
}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;}

.live-page{height:100vh;display:flex;flex-direction:column;overflow:hidden;}
.live-header{flex-shrink:0;background:rgba(6,8,12,0.85);backdrop-filter:blur(24px);border-bottom:1px solid var(--border);padding:14px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
[data-theme="light"] .live-header{background:rgba(255,255,255,0.92);}
.live-logo{font-family:'DM Serif Display',serif;font-size:20px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;cursor:pointer;}
[data-theme="light"] .live-logo{background:linear-gradient(135deg,#355872,#7AAACE);-webkit-background-clip:text;}
.live-controls{display:flex;align-items:center;gap:12px;}
.live-rec-btn{display:flex;align-items:center;gap:6px;padding:8px 20px;border-radius:20px;border:none;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;letter-spacing:0.3px;text-transform:uppercase;}
.live-rec-btn.start{background:linear-gradient(135deg,#3dd68c,#2bc47a);color:#06080c;box-shadow:0 2px 12px rgba(61,214,140,0.35);}
.live-rec-btn.start:hover{box-shadow:0 4px 20px rgba(61,214,140,0.5);transform:translateY(-1px);}
.live-rec-btn.stop{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;box-shadow:0 2px 12px rgba(239,68,68,0.35);animation:livePulse 2s infinite;}
[data-theme="light"] .live-rec-btn.start{background:linear-gradient(135deg,#355872,#7AAACE);color:#F7F8F0;}
.live-stats{display:flex;gap:16px;font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text-dim);}
.live-stat{display:flex;align-items:center;gap:4px;}
.live-stat .val{color:var(--accent);font-weight:600;}

.live-body{flex:1;display:flex;min-height:0;overflow:hidden;}
.live-visual-panel{display:flex;flex-direction:column;overflow:hidden;flex:1;}

.panel-title{flex-shrink:0;padding:12px 20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;}
.panel-title .dot{width:6px;height:6px;border-radius:50%;background:var(--accent);}

/* ===== Scrollable card feed ===== */
.visual-feed{
  flex:1;
  overflow-y:auto;
  overflow-x:hidden;
  padding:16px;
  display:flex;
  flex-direction:column;
  gap:16px;
  scroll-behavior:smooth;
}
.visual-feed::-webkit-scrollbar{width:4px;}
.visual-feed::-webkit-scrollbar-track{background:transparent;}
.visual-feed::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}

.visual-card{
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:16px;
  overflow:hidden;
  opacity:0;
  animation:cardAppear .5s cubic-bezier(0.16,1,0.3,1) forwards;
  flex-shrink:0;
  display:flex;
  flex-direction:column;
  box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04);
}
.visual-card-header{
  padding:14px 18px;
  border-bottom:1px solid var(--border);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
}
.visual-card-title{font-size:14px;font-weight:600;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.visual-card-type{font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent);background:var(--accent-glow);padding:3px 10px;border-radius:10px;flex-shrink:0;}
.visual-card-body{
  min-height:400px;
  padding:16px;
  overflow:visible;
}
.visual-card-footer{
  padding:10px 18px;
  border-top:1px solid var(--border);
  font-size:11px;
  font-family:'JetBrains Mono',monospace;
  color:var(--text-dim);
  line-height:1.6;
}
.visual-card-footer-label{
  font-size:9px;
  text-transform:uppercase;
  letter-spacing:1px;
  color:var(--accent);
  margin-bottom:4px;
  font-weight:600;
}
.visual-card-context{
  font-style:italic;
  word-wrap:break-word;
  white-space:pre-wrap;
  max-height:120px;
  overflow-y:auto;
}
.visual-card-context::-webkit-scrollbar{width:3px;}
.visual-card-context::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}

.visual-empty{color:var(--text-dim);font-size:13px;text-align:center;margin-top:40px;}

/* Listening indicator */
.listening-indicator{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:48px 24px;animation:fadeIn .5s ease;}
.listening-waves{display:flex;align-items:center;gap:4px;height:40px;}
.listening-wave{width:4px;border-radius:4px;background:var(--accent);animation:waveAnim 1.2s ease-in-out infinite;}
.listening-wave:nth-child(1){height:12px;animation-delay:0s;}
.listening-wave:nth-child(2){height:24px;animation-delay:0.1s;}
.listening-wave:nth-child(3){height:36px;animation-delay:0.2s;}
.listening-wave:nth-child(4){height:24px;animation-delay:0.3s;}
.listening-wave:nth-child(5){height:12px;animation-delay:0.4s;}
@keyframes waveAnim{0%,100%{transform:scaleY(0.4);opacity:0.4;}50%{transform:scaleY(1);opacity:1;}}
.listening-label{font-size:14px;font-weight:600;color:var(--text);letter-spacing:0.3px;}
.listening-sublabel{font-size:12px;color:var(--text-dim);margin-top:-12px;}

/* Generating indicator */
.generating-indicator{display:flex;align-items:center;gap:8px;padding:12px 20px;background:var(--accent-glow);border:1px solid rgba(61,214,140,0.15);border-radius:12px;margin-bottom:8px;animation:fadeIn .3s ease;}
[data-theme="light"] .generating-indicator{border-color:rgba(53,88,114,0.12);}
.generating-spinner{width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.generating-text{font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--accent);}

.back-btn{background:none;border:1px solid var(--border);color:var(--text-dim);padding:6px 12px;border-radius:8px;font-size:11px;font-family:'JetBrains Mono',monospace;cursor:pointer;transition:all .2s;}
.back-btn:hover{color:var(--text);border-color:var(--accent);}

.stream-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;border:1px solid var(--border);font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;letter-spacing:0.3px;text-transform:uppercase;background:var(--surface);color:var(--text-dim);}
.stream-btn:hover{border-color:var(--accent);color:var(--text);background:var(--accent-glow);}
.stream-progress{height:2px;background:var(--border);border-radius:1px;overflow:hidden;margin-top:-1px;}
.stream-progress-bar{height:100%;background:linear-gradient(90deg,#f59e0b,#d97706);transition:width 0.3s linear;border-radius:1px;}

@keyframes fadeIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}
@keyframes cardAppear{
  from{opacity:0;transform:translateY(30px) scale(0.97);}
  to{opacity:1;transform:translateY(0) scale(1);}
}
@keyframes livePulse{0%,100%{box-shadow:0 2px 12px rgba(239,68,68,0.35);}50%{box-shadow:0 2px 24px rgba(239,68,68,0.6);}}

@media(max-width:768px){
  .live-header{padding:10px 16px;}
  .visual-feed{padding:12px;}
}
`

// ==================== Config ====================
const THROTTLE_MS = 4000
const SLIDING_WINDOW_SIZE = 5
const STREAM_CHUNK_SIZE = 4000
const STREAM_CHUNK_INTERVAL = 100

export default function LivePage() {
  const navigate = useNavigate()

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)

  // Transcript state
  const [finalLines, setFinalLines] = useState([])
  const [partialText, setPartialText] = useState('')

  // Visual state
  const [isGenerating, setIsGenerating] = useState(false)
  const [visuals, setVisualsRaw] = useState([])
  const visualsRef = useRef([])
  const setVisuals = useCallback((updater) => {
    setVisualsRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      visualsRef.current = next
      return next
    })
  }, [])

  // Stats
  const [finalWordCount, setFinalWordCount] = useState(0)
  const [partialWordCount, setPartialWordCount] = useState(0)
  const [duration, setDuration] = useState(0)

  // Refs
  const wsRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const durationIntervalRef = useRef(null)
  const transcriptEndRef = useRef(null)
  const visualEndRef = useRef(null)

  // Sentence accumulator
  const sentenceBufferRef = useRef([])

  // Tracks new sentences since last generation (for context display)
  const newSentencesRef = useRef([])

  // Throttle refs
  const lastGenTimeRef = useRef(0)
  const throttleTimerRef = useRef(null)
  const pendingTextRef = useRef(null)
  const isGeneratingRef = useRef(false)
  const abortRef = useRef(null)
  const currentChartRef = useRef(null)


  // Audio file streaming refs
  const fileInputRef = useRef(null)
  const streamIntervalRef = useRef(null)
  const audioElementRef = useRef(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamProgress, setStreamProgress] = useState(0)
  const [streamFileName, setStreamFileName] = useState('')

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [finalLines, partialText])

  // Auto-scroll visuals
  useEffect(() => {
    if (visualEndRef.current) {
      visualEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [visuals])

  // Duration timer
  useEffect(() => {
    if (isRecording) {
      const start = Date.now()
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000))
      }, 1000)
    } else {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
    }
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
    }
  }, [isRecording])

  const formatDuration = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ==================== Chart Generation (single-stage, throttled) ====================

  const generateChart = useCallback(async (text) => {
    if (!text.trim() || isGeneratingRef.current) return
    isGeneratingRef.current = true
    setIsGenerating(true)

    // Grab all new sentences accumulated since last generation
    const grabbedSentences = [...newSentencesRef.current]
    newSentencesRef.current = []

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const body = { text: text.trim() }
      if (currentChartRef.current) body.currentChart = currentChartRef.current

      // Pass existing chart types so Claude can vary
      const existingTypes = visualsRef.current.map(v => v.data?.type).filter(Boolean)
      if (existingTypes.length > 0) body.existingTypes = existingTypes

      const res = await fetch('/api/generate-chart-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) return

      const data = await res.json()

      // Claude said skip
      if (!data || data.action === 'skip' || data.skip || !data.type) return

      const action = data.action || 'new'
      const chartData = { ...data }
      delete chartData.action

      currentChartRef.current = chartData
      const grabbedText = grabbedSentences.join(' ')

      if (action === 'update') {
        // Replace last card, accumulate grabbed sentences into existing context
        setVisuals(prev => {
          if (prev.length === 0) return [{ data: chartData, context: grabbedText || text.trim() }]
          const updated = [...prev]
          const last = updated[updated.length - 1]
          const prevContext = last.context || ''
          const fullContext = grabbedText
            ? (prevContext + ' ' + grabbedText).trim()
            : prevContext
          updated[updated.length - 1] = { data: chartData, context: fullContext }
          return updated
        })
      } else {
        // New chart — add as new card, reset buffer for fresh topic
        sentenceBufferRef.current = []
        currentChartRef.current = null
        setVisuals(prev => [...prev, { data: chartData, context: grabbedText || text.trim() }])
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Chart generation error:', err)
    } finally {
      isGeneratingRef.current = false
      setIsGenerating(false)
      if (abortRef.current === controller) abortRef.current = null
      lastGenTimeRef.current = Date.now()

      // Process queued text
      const queued = pendingTextRef.current
      if (queued) {
        pendingTextRef.current = null
        scheduleGeneration(queued)
      }
    }
  }, [])

  const scheduleGeneration = useCallback((text) => {
    const now = Date.now()
    const elapsed = now - lastGenTimeRef.current

    if (isGeneratingRef.current) {
      pendingTextRef.current = text
      return
    }

    if (elapsed < THROTTLE_MS) {
      pendingTextRef.current = text
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current)
      throttleTimerRef.current = setTimeout(() => {
        const queued = pendingTextRef.current
        pendingTextRef.current = null
        if (queued) generateChart(queued)
      }, THROTTLE_MS - elapsed)
      return
    }

    generateChart(text)
  }, [generateChart])

  const onSentenceFinalized = useCallback((sentence) => {
    sentenceBufferRef.current.push(sentence)
    newSentencesRef.current.push(sentence)
    const windowText = sentenceBufferRef.current.slice(-SLIDING_WINDOW_SIZE).join(' ')
    scheduleGeneration(windowText)
  }, [scheduleGeneration])

  const flushBuffer = useCallback(() => {
    if (sentenceBufferRef.current.length > 0) {
      const windowText = sentenceBufferRef.current.slice(-SLIDING_WINDOW_SIZE).join(' ')
      if (windowText.trim()) scheduleGeneration(windowText)
    }
  }, [scheduleGeneration])

  // ==================== Recording ====================

  const handleWsMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.data)
      if (msg.type === 'transcript') {
        if (msg.isFinal) {
          const text = msg.text
          setFinalLines(prev => [...prev, text])
          setPartialText('')
          setPartialWordCount(0)

          const newWords = text.split(/\s+/).filter(Boolean).length
          setFinalWordCount(prev => prev + newWords)

          onSentenceFinalized(text)
        } else {
          setPartialText(msg.text)
          setPartialWordCount(msg.text.split(/\s+/).filter(Boolean).length)
        }
      } else if (msg.type === 'Error') {
        setError(msg.message)
      }
    } catch (e) {
      console.error('Parse error:', e)
    }
  }, [onSentenceFinalized])

  const resetSessionState = useCallback(() => {
    setError(null)
    setFinalLines([])
    setPartialText('')
    setVisuals([])
    setFinalWordCount(0)
    setPartialWordCount(0)
    setDuration(0)
    sentenceBufferRef.current = []
    newSentencesRef.current = []
    lastGenTimeRef.current = 0
    pendingTextRef.current = null
    currentChartRef.current = null
  }, [])

  const startRecording = useCallback(async () => {
    if (wsRef.current) return
    resetSessionState()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ws = new WebSocket('ws://localhost:3001/api/speech')
      wsRef.current = ws

      ws.onopen = () => {
        setIsRecording(true)
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        mediaRecorderRef.current = recorder

        recorder.addEventListener('dataavailable', (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data)
          }
        })
        recorder.start(100)
      }

      ws.onmessage = handleWsMessage

      ws.onerror = () => {
        setError('Connection to transcription server failed. Is the backend running?')
        stopRecording()
      }

      ws.onclose = () => {
        if (wsRef.current === ws) stopRecording()
      }
    } catch (err) {
      setError('Microphone access denied.')
    }
  }, [handleWsMessage, resetSessionState])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    const ws = wsRef.current
    wsRef.current = null
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stop' }))
      setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.close() }, 500)
    }

    if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current)
    setIsRecording(false)

    flushBuffer()
  }, [flushBuffer])

  // ==================== Audio File Streaming ====================

  const stopStreaming = useCallback(() => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current)
      streamIntervalRef.current = null
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause()
      URL.revokeObjectURL(audioElementRef.current.src)
      audioElementRef.current = null
    }

    const ws = wsRef.current
    wsRef.current = null
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stop' }))
      setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.close() }, 500)
    }

    if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current)
    setIsStreaming(false)
    setIsRecording(false)
    setStreamProgress(0)

    flushBuffer()
  }, [flushBuffer])

  const streamAudioFile = useCallback(async (file) => {
    if (wsRef.current) return
    resetSessionState()
    setStreamProgress(0)
    setStreamFileName(file.name)

    try {
      const audioUrl = URL.createObjectURL(file)
      const audio = new Audio(audioUrl)
      audioElementRef.current = audio

      const arrayBuffer = await file.arrayBuffer()
      const totalBytes = arrayBuffer.byteLength
      let offset = 0

      const ws = new WebSocket('ws://localhost:3001/api/speech')
      wsRef.current = ws

      ws.onopen = () => {
        setIsRecording(true)
        setIsStreaming(true)

        audio.play().catch(() => {})

        audio.addEventListener('ended', () => {
          setTimeout(() => {
            if (wsRef.current === ws) stopStreaming()
          }, 4000)
        })

        streamIntervalRef.current = setInterval(() => {
          if (offset >= totalBytes) {
            clearInterval(streamIntervalRef.current)
            streamIntervalRef.current = null
            setStreamProgress(100)
            return
          }

          const end = Math.min(offset + STREAM_CHUNK_SIZE, totalBytes)
          const chunk = arrayBuffer.slice(offset, end)

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(chunk)
          }

          offset = end
          setStreamProgress(Math.round((offset / totalBytes) * 100))
        }, STREAM_CHUNK_INTERVAL)
      }

      ws.onmessage = handleWsMessage

      ws.onerror = () => {
        setError('Connection to transcription server failed. Is the backend running?')
        stopStreaming()
      }

      ws.onclose = () => {
        if (wsRef.current === ws) stopStreaming()
      }
    } catch (err) {
      setError(`Failed to read audio file: ${err.message}`)
    }
  }, [handleWsMessage, resetSessionState, stopStreaming])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) streamAudioFile(file)
    e.target.value = ''
  }, [streamAudioFile])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)
      if (audioElementRef.current) {
        audioElementRef.current.pause()
        URL.revokeObjectURL(audioElementRef.current.src)
      }
    }
  }, [])

  // ==================== Render ====================

  return (
    <div className="live-page">
      <style>{LIVE_CSS}</style>

      {/* Header */}
      <header className="live-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="live-logo" onClick={() => navigate('/')}>VisualScript</div>
          <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        </div>

        <div className="live-controls">
          {isRecording && (
            <div className="live-stats">
              <span className="live-stat">⏱ <span className="val">{formatDuration(duration)}</span></span>
              <span className="live-stat">Words: <span className="val">{finalWordCount + partialWordCount}</span></span>
              <span className="live-stat">Visuals: <span className="val">{visuals.length}</span></span>
            </div>
          )}
          {!isRecording && !isStreaming && (
            <>
              <button
                className="stream-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Stream Audio
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.webm,.m4a,.ogg,.flac,.aac"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </>
          )}
          <button
            className={`live-rec-btn ${isRecording ? 'stop' : 'start'}`}
            onClick={isRecording
              ? (isStreaming ? stopStreaming : stopRecording)
              : startRecording}
          >
            {isRecording
              ? (isStreaming ? '⬛ Stop Stream' : '⬛ Stop Session')
              : '🎙 Start Live Session'}
          </button>
        </div>
      </header>

      {/* Stream progress bar */}
      {isStreaming && (
        <div className="stream-progress">
          <div className="stream-progress-bar" style={{ width: `${streamProgress}%` }} />
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 32px',
          background: 'rgba(239,68,68,0.08)',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444',
          fontSize: '12px',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="live-body">
        <div className="live-visual-panel">
          <div className="panel-title">
            <span className="dot" />
            AI Visuals
          </div>
          <div className="visual-feed">
            {visuals.length === 0 && !isRecording && (
              <div className="visual-empty">
                Start a session to generate real-time visuals
              </div>
            )}

            {visuals.length === 0 && isRecording && (
              <div className="listening-indicator">
                <div className="listening-waves">
                  <div className="listening-wave" />
                  <div className="listening-wave" />
                  <div className="listening-wave" />
                  <div className="listening-wave" />
                  <div className="listening-wave" />
                </div>
                <div className="listening-label">
                  {isGenerating ? 'Generating visual...' : 'Listening...'}
                </div>
                <div className="listening-sublabel">
                  {isGenerating
                    ? 'AI is creating a visualization from your speech'
                    : 'Speak naturally — visuals will appear automatically'}
                </div>
              </div>
            )}

            {visuals.length > 0 && isGenerating && (
              <div className="generating-indicator">
                <div className="generating-spinner" />
                <span className="generating-text">Generating visual...</span>
              </div>
            )}

            {visuals.map((v, i) => (
              <div key={`chart-${i}-${v.data?.title}`} className="visual-card">
                <div className="visual-card-header">
                  <span className="visual-card-title">{v.data.title || `Visual ${i + 1}`}</span>
                  <span className="visual-card-type">{v.data.type}</span>
                </div>
                <div className="visual-card-body">
                  <ChartRouter data={v.data} />
                </div>
                <div className="visual-card-footer">
                  <div className="visual-card-footer-label">Transcript</div>
                  <div className="visual-card-context">{v.context}</div>
                </div>
              </div>
            ))}

            <div ref={visualEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
