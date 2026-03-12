import { memo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../context/ThemeContext'

const TOGGLE_CSS = `
.theme-toggle{position:fixed;bottom:24px;right:24px;z-index:99999;width:48px;height:48px;border-radius:50%;border:2px solid rgba(53,88,114,0.2);background:rgba(14,17,23,0.9);backdrop-filter:blur(12px);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;transition:all .3s cubic-bezier(0.4,0,0.2,1);box-shadow:0 4px 20px rgba(0,0,0,0.4);}
.theme-toggle:hover{transform:translateY(-2px) scale(1.08);box-shadow:0 8px 28px rgba(0,0,0,0.5);border-color:rgba(61,214,140,0.4);}
.theme-toggle:active{transform:scale(0.95);}
[data-theme="light"] .theme-toggle{background:rgba(255,255,255,0.95);border-color:rgba(53,88,114,0.15);box-shadow:0 4px 20px rgba(53,88,114,0.15);}
[data-theme="light"] .theme-toggle:hover{box-shadow:0 8px 28px rgba(53,88,114,0.2);border-color:rgba(53,88,114,0.3);}
`

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const styleRef = useRef(null)

  useEffect(() => {
    if (!document.getElementById('theme-toggle-css')) {
      const style = document.createElement('style')
      style.id = 'theme-toggle-css'
      style.textContent = TOGGLE_CSS
      document.head.appendChild(style)
      styleRef.current = style
    }
    return () => {
      const el = document.getElementById('theme-toggle-css')
      if (el) el.remove()
    }
  }, [])

  return createPortal(
    <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
    </button>,
    document.body
  )
}

export default memo(ThemeToggle)
