/**
 * Thumbs up/down feedback overlay for visual cards.
 */

import { useState } from 'react'
import { submitFeedback } from '../services/templateService'

const CSS = `
.vf-wrap{display:flex;gap:6px;margin-top:8px;justify-content:flex-end;}
.vf-btn{width:28px;height:28px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .2s;padding:0;}
.vf-btn:hover{border-color:var(--accent);color:var(--accent);transform:scale(1.1);}
.vf-btn.active-up{background:rgba(61,214,140,0.12);border-color:#3dd68c;color:#3dd68c;}
.vf-btn.active-down{background:rgba(255,80,80,0.12);border-color:#ff5050;color:#ff5050;}
.vf-btn:disabled{opacity:.5;cursor:default;transform:none;}
[data-theme="light"] .vf-btn{background:#fff;}
`

let _cssInjected = false

export default function VisualFeedback({ templateId, sessionId, visualData }) {
  const [rating, setRating] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (!_cssInjected) {
    if (!document.getElementById('vf-css')) {
      const el = document.createElement('style')
      el.id = 'vf-css'
      el.textContent = CSS
      document.head.appendChild(el)
    }
    _cssInjected = true
  }

  const handleRate = async (value) => {
    if (submitting || rating !== null) return
    setSubmitting(true)
    setRating(value)
    await submitFeedback(templateId, sessionId, value, visualData)
    setSubmitting(false)
  }

  return (
    <div className="vf-wrap">
      <button
        className={`vf-btn${rating === 1 ? ' active-up' : ''}`}
        onClick={() => handleRate(1)}
        disabled={submitting || rating !== null}
        title="Helpful"
      >
        👍
      </button>
      <button
        className={`vf-btn${rating === -1 ? ' active-down' : ''}`}
        onClick={() => handleRate(-1)}
        disabled={submitting || rating !== null}
        title="Not helpful"
      >
        👎
      </button>
    </div>
  )
}
