import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ChartRouter from '../components/ChartRouter'
import { createEvolvingChartController } from '../services/evolvingChartController'
import { saveLiveSession } from '../services/sessionStorage'

// ==================== CSS ====================
const LIVE_CSS = `
:root {
  --bg: #06080c;
  --surface: #0e1117;
  --surface-2: #151921;
  --border: rgba(255,255,255,0.06);
  --text: #e8eaf0;
  --text-dim: #9ca3af;
  --accent: #3dd68c;
  --accent-glow: rgba(61,214,140,0.12);
}
[data-theme="light"] {
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface-2: #f1f5f9;
  --border: rgba(99,102,241,0.1);
  --text: #0f172a;
  --text-dim: #64748b;
  --accent: #6366f1;
  --accent-glow: rgba(99,102,241,0.08);
}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;}

.live-page{height:100vh;display:flex;flex-direction:column;overflow:hidden;}
.live-header{flex-shrink:0;background:rgba(6,8,12,0.85);backdrop-filter:blur(24px);border-bottom:1px solid var(--border);padding:14px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
[data-theme="light"] .live-header{background:rgba(255,255,255,0.95);}
.live-logo{font-family:'DM Serif Display',serif;font-size:20px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;cursor:pointer;}
[data-theme="light"] .live-logo{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;}
.live-controls{display:flex;align-items:center;gap:12px;}
.live-rec-btn{display:flex;align-items:center;gap:6px;padding:8px 20px;border-radius:20px;border:none;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;letter-spacing:0.3px;text-transform:uppercase;}
.live-rec-btn.start{background:linear-gradient(135deg,#3dd68c,#2bc47a);color:#06080c;box-shadow:0 2px 12px rgba(61,214,140,0.35);}
.live-rec-btn.start:hover{box-shadow:0 4px 20px rgba(61,214,140,0.5);transform:translateY(-1px);}
.live-rec-btn.stop{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;box-shadow:0 2px 12px rgba(239,68,68,0.35);animation:livePulse 2s infinite;}
[data-theme="light"] .live-rec-btn.start{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;box-shadow:0 2px 12px rgba(99,102,241,0.35);}
[data-theme="light"] .live-rec-btn.start:hover{box-shadow:0 4px 20px rgba(99,102,241,0.5);}
.live-stats{display:flex;gap:16px;font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text-dim);}
.live-stat{display:flex;align-items:center;gap:4px;}
.live-stat .val{color:var(--accent);font-weight:600;}

.live-body{flex:1;display:flex;min-height:0;overflow:hidden;}
.live-visual-panel{display:flex;flex-direction:column;overflow:hidden;flex:1;min-width:0;}

.live-transcript-panel{display:flex;flex-direction:column;overflow:hidden;width:340px;flex-shrink:0;border-left:1px solid var(--border);background:var(--surface);}
.transcript-feed{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:2px;}
.transcript-feed::-webkit-scrollbar{width:4px;}
.transcript-feed::-webkit-scrollbar-track{background:transparent;}
.transcript-feed::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}
.transcript-line{font-size:13px;line-height:1.7;color:var(--text);font-family:'DM Sans',sans-serif;padding:2px 0;}
.transcript-partial{font-size:13px;line-height:1.7;color:var(--text-dim);font-family:'DM Sans',sans-serif;font-style:italic;padding:2px 0;}
.transcript-empty{color:var(--text-dim);font-size:12px;text-align:center;margin-top:32px;line-height:1.6;}

.panel-title{flex-shrink:0;padding:12px 20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;}
.panel-title .dot{width:6px;height:6px;border-radius:50%;background:var(--accent);}

/* ===== Scrollable visual feed ===== */
.visual-feed{
  flex:1;
  overflow-y:auto;
  overflow-x:hidden;
  padding:20px;
  display:flex;
  flex-direction:column;
  gap:24px;
  scroll-behavior:smooth;
}
.visual-feed::-webkit-scrollbar{width:4px;}
.visual-feed::-webkit-scrollbar-track{background:transparent;}
.visual-feed::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}

.visual-card{
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:16px;
  display:flex;
  flex-direction:column;
  flex-shrink:0;
  box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04);
  animation:chartSlideIn .5s cubic-bezier(0.22,1,0.36,1);
  transition:border-color .3s ease, box-shadow .3s ease;
}
.visual-card.is-active{
  border-color:var(--accent);
  box-shadow:0 0 0 1px var(--accent), 0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04);
}
.visual-card-header{
  padding:14px 18px;
  border-bottom:1px solid var(--border);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  border-radius:16px 16px 0 0;
  background:var(--surface);
}
.visual-card-title{font-size:15px;font-weight:600;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.visual-card-type{font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent);background:var(--accent-glow);padding:3px 10px;border-radius:10px;flex-shrink:0;}
.visual-card-live{font-size:9px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;color:#f59e0b;background:rgba(245,158,11,0.1);padding:3px 8px;border-radius:10px;flex-shrink:0;animation:pulseDot 2s ease-in-out infinite;}
.visual-card-body{
  padding:16px;
  position:relative;
}
.visual-card-body-inner{
  min-height:400px;
  width:100%;
}

/* Napkin image display */
.napkin-image-container{
  width:100%;
  min-height:400px;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:16px;
}
.napkin-image-container img{
  max-width:100%;
  object-fit:contain;
  border-radius:8px;
}
.napkin-loading{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:12px;
  min-height:400px;
  color:var(--text-dim);
  font-size:13px;
}
.napkin-spinner{
  width:32px;height:32px;
  border:3px solid var(--border);
  border-top-color:var(--accent);
  border-radius:50%;
  animation:spin 0.8s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg);}}
.napkin-error{
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:400px;
  color:var(--text-dim);
  font-size:13px;
  text-align:center;
  padding:24px;
}

/* ===== Source toggle ===== */
.source-toggle{
  display:flex;
  align-items:center;
  background:var(--surface-2);
  border-radius:8px;
  padding:2px;
  gap:2px;
  flex-shrink:0;
}
.source-toggle-btn{
  padding:4px 12px;
  border-radius:6px;
  border:none;
  font-size:10px;
  font-family:'JetBrains Mono',monospace;
  font-weight:600;
  text-transform:uppercase;
  letter-spacing:0.5px;
  cursor:pointer;
  transition:all .2s;
  background:transparent;
  color:var(--text-dim);
}
.source-toggle-btn.active{
  background:var(--accent);
  color:#06080c;
  box-shadow:0 1px 4px rgba(0,0,0,0.15);
}
[data-theme="light"] .source-toggle-btn.active{
  color:#ffffff;
}

/* ===== Per-card transcript ===== */
.card-transcript{
  border-top:1px solid var(--border);
  max-height:0;
  overflow:hidden;
  transition:max-height 0.3s ease;
}
.card-transcript.open{
  max-height:300px;
}
.card-transcript-toggle{
  padding:8px 18px;
  border-top:1px solid var(--border);
  display:flex;
  align-items:center;
  gap:6px;
  cursor:pointer;
  font-size:11px;
  font-family:'JetBrains Mono',monospace;
  color:var(--text-dim);
  transition:color .2s;
  background:none;
  border-left:none;
  border-right:none;
  border-bottom:none;
  width:100%;
  text-align:left;
}
.card-transcript-toggle:hover{color:var(--accent);}
.card-transcript-toggle .arrow{
  transition:transform .2s;
  font-size:10px;
}
.card-transcript-toggle .arrow.open{transform:rotate(90deg);}
.card-transcript-content{
  padding:12px 18px;
  overflow-y:auto;
  max-height:260px;
  font-size:12px;
  line-height:1.7;
  color:var(--text-dim);
  font-family:'DM Sans',sans-serif;
}
.card-transcript-content::-webkit-scrollbar{width:3px;}
.card-transcript-content::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
.card-transcript-sentence{padding:2px 0;}
.card-transcript-toggle.transformed{
  color:var(--accent);
  border-top:1px solid var(--border);
}
.transformed-content{
  color:var(--text);
  font-style:italic;
  line-height:1.8;
}

/* Generating pulse dot */
.gen-pulse{
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px 16px;
  font-size:11px;
  font-family:'JetBrains Mono',monospace;
  color:var(--accent);
}
.gen-dot{
  width:8px;height:8px;border-radius:50%;
  background:var(--accent);
  animation:pulseDot 1.5s ease-in-out infinite;
}
@keyframes pulseDot{0%,100%{opacity:0.3;transform:scale(0.8);}50%{opacity:1;transform:scale(1.2);}}

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

.back-btn{background:none;border:1px solid var(--border);color:var(--text-dim);padding:6px 12px;border-radius:8px;font-size:11px;font-family:'JetBrains Mono',monospace;cursor:pointer;transition:all .2s;}
.back-btn:hover{color:var(--text);border-color:var(--accent);}

.stream-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;border:1px solid var(--border);font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s;letter-spacing:0.3px;text-transform:uppercase;background:var(--surface);color:var(--text-dim);}
.stream-btn:hover{border-color:var(--accent);color:var(--text);background:var(--accent-glow);}
.stream-progress{height:2px;background:var(--border);border-radius:1px;overflow:hidden;margin-top:-1px;}
.stream-progress-bar{height:100%;background:linear-gradient(90deg,#f59e0b,#d97706);transition:width 0.3s linear;border-radius:1px;}

@keyframes fadeIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}
@keyframes chartSlideIn{
  0%{opacity:0;transform:translateY(40px) scale(0.97);}
  40%{opacity:1;}
  100%{opacity:1;transform:translateY(0) scale(1);}
}
@keyframes livePulse{0%,100%{box-shadow:0 2px 12px rgba(239,68,68,0.35);}50%{box-shadow:0 2px 24px rgba(239,68,68,0.6);}}

@media(max-width:768px){
  .live-header{padding:10px 16px;}
  .visual-feed{padding:12px;}
  .live-transcript-panel{display:none;}
}
`

// ==================== Config ====================
const STREAM_CHUNK_SIZE = 4000
const STREAM_CHUNK_INTERVAL = 100

// ==================== Napkin AI Helper ====================
async function requestNapkinVisual(text, forcedType) {
  const body = { text }
  if (forcedType) body.forcedType = forcedType

  const res = await fetch('/api/generate-chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Napkin API error (${res.status})`)
  }
  return res.json()
}

// ==================== Card Transcript Component ====================
function CardTranscript({ sentences, transformedTranscript, showTransformed }) {
  const [openOriginal, setOpenOriginal] = useState(false)
  const [openTransformed, setOpenTransformed] = useState(false)

  const hasOriginal = sentences && sentences.length > 0
  const hasTransformed = !!transformedTranscript

  if (!hasOriginal && !hasTransformed) return null

  return (
    <>
      {hasTransformed && showTransformed && (
        <>
          <button className="card-transcript-toggle transformed" onClick={() => setOpenTransformed(o => !o)}>
            <span className={`arrow${openTransformed ? ' open' : ''}`}>▶</span>
            <span>Transformed Transcript</span>
          </button>
          <div className={`card-transcript${openTransformed ? ' open' : ''}`}>
            <div className="card-transcript-content transformed-content">
              {transformedTranscript}
            </div>
          </div>
        </>
      )}
      {hasOriginal && (
        <>
          <button className="card-transcript-toggle" onClick={() => setOpenOriginal(o => !o)}>
            <span className={`arrow${openOriginal ? ' open' : ''}`}>▶</span>
            <span>Original Transcript ({sentences.length} sentences)</span>
          </button>
          <div className={`card-transcript${openOriginal ? ' open' : ''}`}>
            <div className="card-transcript-content">
              {sentences.map((s, i) => (
                <div key={i} className="card-transcript-sentence">{s}</div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ==================== Main Component ====================
export default function LivePage() {
  const navigate = useNavigate()

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)

  // Transcript state
  const [finalLines, setFinalLines] = useState([])
  const [partialText, setPartialText] = useState('')

  // Visual state — scrollable feed of chart cards
  // Each item: { id, claudeChart, topicSentences, napkinImage, napkinLoading, napkinError }
  const [chartFeed, setChartFeed] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Source toggle: 'claude' or 'napkin'
  const [viewSource, setViewSource] = useState('claude')

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
  const feedEndRef = useRef(null)
  const controllerRef = useRef(null)
  const feedIdCounter = useRef(0)

  // Audio file streaming refs
  const fileInputRef = useRef(null)
  const streamIntervalRef = useRef(null)
  const audioElementRef = useRef(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamProgress, setStreamProgress] = useState(0)
  const [streamFileName, setStreamFileName] = useState('')
  const streamFileRef = useRef(null)

  // Supabase save state
  const [sessionSaved, setSessionSaved] = useState(false)
  const [hasStopped, setHasStopped] = useState(false)

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [finalLines, partialText])

  // Auto-scroll feed to bottom on new cards
  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chartFeed.length])

  // Auto-save to Supabase when session ends and all generation completes
  useEffect(() => {
    if (!hasStopped || isGenerating || sessionSaved) return
    if (finalLines.length === 0) return

    setSessionSaved(true)
    saveLiveSession({
      finalLines,
      chartFeed,
      duration,
      wordCount: finalWordCount,
      audioFile: streamFileRef.current || null,
      audioFileName: streamFileName || null,
    }).then(({ error }) => {
      if (error && error !== 'Supabase not configured') {
        console.error('Live session save failed:', error)
      }
    })
  }, [hasStopped, isGenerating, sessionSaved, finalLines, chartFeed, duration, finalWordCount, streamFileName])

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

  // ==================== Napkin AI Request ====================

  const triggerNapkinGeneration = useCallback((feedId, sentences, transformedTranscript, napkinVisualType) => {
    // Prefer transformed transcript for better Napkin visuals, fallback to raw sentences
    const text = transformedTranscript || sentences.join(' ')
    if (!text.trim()) return

    requestNapkinVisual(text, napkinVisualType || null)
      .then((data) => {
        setChartFeed(prev => prev.map(item =>
          item.id === feedId
            ? { ...item, napkinImage: data.imageUrl || null, napkinLoading: false, napkinError: data.imageUrl ? null : 'No image returned' }
            : item
        ))
      })
      .catch((err) => {
        setChartFeed(prev => prev.map(item =>
          item.id === feedId
            ? { ...item, napkinLoading: false, napkinError: err.message }
            : item
        ))
      })
  }, [])

  // ==================== Evolving Chart Controller ====================

  const initController = useCallback(() => {
    if (controllerRef.current) controllerRef.current.destroy()

    controllerRef.current = createEvolvingChartController({
      onChartUpdate: (chartData, topicSentences, transformedTranscript) => {
        // Update the last card in the feed
        setChartFeed(prev => {
          if (prev.length === 0) return prev
          const updated = [...prev]
          const last = updated[updated.length - 1]
          updated[updated.length - 1] = {
            ...last,
            claudeChart: chartData,
            topicSentences: topicSentences || last.topicSentences,
            transformedTranscript: transformedTranscript || last.transformedTranscript,
          }
          return updated
        })
      },
      onChartNew: (chartData, topicSentences, transformedTranscript) => {
        const newId = ++feedIdCounter.current
        const newItem = {
          id: newId,
          claudeChart: chartData,
          topicSentences: topicSentences || [],
          transformedTranscript: transformedTranscript || null,
          napkinImage: null,
          napkinLoading: true,
          napkinError: null,
        }
        setChartFeed(prev => [...prev, newItem])

        // Fire off Napkin AI generation in parallel — use transformed transcript if available
        triggerNapkinGeneration(newId, topicSentences || [], transformedTranscript, chartData?.napkinVisualType)
      },
      onChartSkip: () => {},
      onError: (msg) => {
        setError(msg)
        setTimeout(() => setError(prev => prev === msg ? null : prev), 5000)
      },
      onGeneratingChange: (gen) => setIsGenerating(gen),
    })
  }, [triggerNapkinGeneration])

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

          // Feed to the evolving chart controller
          if (controllerRef.current) {
            controllerRef.current.addSentence(text)
          }
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
  }, [])

  const resetSessionState = useCallback(() => {
    setError(null)
    setFinalLines([])
    setPartialText('')
    setChartFeed([])
    setFinalWordCount(0)
    setPartialWordCount(0)
    setDuration(0)
    setSessionSaved(false)
    setHasStopped(false)
    streamFileRef.current = null
    feedIdCounter.current = 0
    if (controllerRef.current) controllerRef.current.reset()
  }, [])

  const startRecording = useCallback(async () => {
    if (wsRef.current) return
    resetSessionState()
    initController()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ws = new WebSocket('ws://localhost:3001/api/speech')
      wsRef.current = ws

      ws.onopen = () => {
        setIsRecording(true)

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
        const source = audioCtx.createMediaStreamSource(stream)
        const processor = audioCtx.createScriptProcessor(2048, 1, 1)
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return
          const float32 = e.inputBuffer.getChannelData(0)
          const int16 = new Int16Array(float32.length)
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]))
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
          ws.send(int16.buffer)
        }
        source.connect(processor)
        processor.connect(audioCtx.destination)
        mediaRecorderRef.current = { stop: () => { processor.disconnect(); source.disconnect(); audioCtx.close() }, state: 'recording' }
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
  }, [handleWsMessage, resetSessionState, initController])

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

    setIsRecording(false)
    setHasStopped(true)

    // Flush any remaining buffered sentences
    if (controllerRef.current) controllerRef.current.flush()
  }, [])

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

    setIsStreaming(false)
    setIsRecording(false)
    setStreamProgress(0)
    setHasStopped(true)

    if (controllerRef.current) controllerRef.current.flush()
  }, [])

  const streamAudioFile = useCallback(async (file) => {
    if (wsRef.current) return
    resetSessionState()
    initController()
    setStreamProgress(0)
    setStreamFileName(file.name)
    streamFileRef.current = file

    try {
      const audioUrl = URL.createObjectURL(file)
      const audio = new Audio(audioUrl)
      audioElementRef.current = audio

      const fileBuffer = await file.arrayBuffer()
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
      const decoded = await audioCtx.decodeAudioData(fileBuffer)
      const float32 = decoded.getChannelData(0)
      const pcm16 = new Int16Array(float32.length)
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]))
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }
      audioCtx.close()
      const pcmBuffer = pcm16.buffer
      const totalBytes = pcmBuffer.byteLength
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
          const chunk = pcmBuffer.slice(offset, end)

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
  }, [handleWsMessage, resetSessionState, initController, stopStreaming])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) streamAudioFile(file)
    e.target.value = ''
  }, [streamAudioFile])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      if (controllerRef.current) controllerRef.current.destroy()
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
              <span className="live-stat">Charts: <span className="val">{chartFeed.length}</span></span>
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
            {isGenerating && (
              <div className="gen-pulse">
                <div className="gen-dot" />
                <span>Evolving...</span>
              </div>
            )}
            <div style={{ flex: 1 }} />
            {/* Source toggle */}
            <div className="source-toggle">
              <button
                className={`source-toggle-btn${viewSource === 'claude' ? ' active' : ''}`}
                onClick={() => setViewSource('claude')}
              >
                Claude
              </button>
              <button
                className={`source-toggle-btn${viewSource === 'napkin' ? ' active' : ''}`}
                onClick={() => setViewSource('napkin')}
              >
                Napkin AI
              </button>
            </div>
          </div>

          {/* Scrollable visual feed */}
          <div className="visual-feed">
            {chartFeed.length === 0 && !isRecording && (
              <div className="visual-empty">
                Start a session to generate real-time visuals
              </div>
            )}

            {chartFeed.length === 0 && isRecording && (
              <div className="listening-indicator">
                <div className="listening-waves">
                  <div className="listening-wave" />
                  <div className="listening-wave" />
                  <div className="listening-wave" />
                  <div className="listening-wave" />
                  <div className="listening-wave" />
                </div>
                <div className="listening-label">
                  {isGenerating ? 'Generating first visual...' : 'Listening...'}
                </div>
                <div className="listening-sublabel">
                  {isGenerating
                    ? 'AI is analyzing your speech'
                    : 'Speak naturally — charts will appear automatically'}
                </div>
              </div>
            )}

            {chartFeed.map((item, idx) => {
              const isLast = idx === chartFeed.length - 1
              const showClaude = viewSource === 'claude'

              return (
                <div key={item.id} className={`visual-card${isLast && isRecording ? ' is-active' : ''}`}>
                  <div className="visual-card-header">
                    <span className="visual-card-title">
                      {item.claudeChart?.title || `Topic ${idx + 1}`}
                    </span>
                    <span className="visual-card-type">
                      {item.claudeChart?.type?.replace('_', ' ') || 'chart'}
                    </span>
                    {isLast && isRecording && (
                      <span className="visual-card-live">LIVE</span>
                    )}
                  </div>

                  <div className="visual-card-body">
                    <div className="visual-card-body-inner" data-chart-id={item.id}>
                      {showClaude ? (
                        <ChartRouter data={item.claudeChart} />
                      ) : (
                        item.napkinLoading ? (
                          <div className="napkin-loading">
                            <div className="napkin-spinner" />
                            <span>Generating Napkin AI visual...</span>
                          </div>
                        ) : item.napkinError ? (
                          <div className="napkin-error">
                            <span>Napkin AI: {item.napkinError}</span>
                          </div>
                        ) : item.napkinImage ? (
                          <div className="napkin-image-container">
                            <img
                              src={item.napkinImage}
                              alt={item.claudeChart?.title || 'Napkin Visual'}
                            />
                          </div>
                        ) : (
                          <div className="napkin-error">
                            <span>No Napkin visual available</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Per-card transcript */}
                  <CardTranscript
                    sentences={item.topicSentences}
                    transformedTranscript={item.transformedTranscript}
                    showTransformed={!showClaude}
                  />
                </div>
              )
            })}

            <div ref={feedEndRef} />
          </div>
        </div>

        {/* Right: Live transcript panel */}
        <div className="live-transcript-panel">
          <div className="panel-title">
            <span className="dot" />
            Live Transcript
          </div>
          <div className="transcript-feed">
            {finalLines.length === 0 && !partialText && (
              <div className="transcript-empty">
                {isRecording
                  ? 'Listening for speech...'
                  : 'Transcript will appear here'}
              </div>
            )}
            {finalLines.map((line, i) => (
              <div key={i} className="transcript-line">{line}</div>
            ))}
            {partialText && (
              <div className="transcript-partial">{partialText}</div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
