/**
 * Admin panel layout with sidebar navigation.
 */

import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const ADMIN_CSS = `
.adm-page{display:grid;grid-template-columns:220px 1fr;height:100vh;overflow:hidden;background:var(--bg);}
.adm-sidebar{background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:20px 0;}
.adm-sb-title{font-family:'DM Serif Display',serif;font-size:18px;padding:0 20px 20px;background:linear-gradient(135deg,#3dd68c,#5bf5dc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;border-bottom:1px solid var(--border);}
[data-theme="light"] .adm-sb-title{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;}
.adm-nav{display:flex;flex-direction:column;gap:2px;padding:16px 12px;}
.adm-nav-link{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:13px;font-weight:500;color:var(--text-dim);text-decoration:none;transition:all .2s;border:none;background:none;cursor:pointer;font-family:'DM Sans',sans-serif;}
.adm-nav-link:hover{color:var(--text);background:var(--surface-2);}
.adm-nav-link.active{color:var(--accent);background:var(--accent-glow);font-weight:600;}
.adm-nav-icon{font-size:16px;width:20px;text-align:center;}
.adm-back{margin-top:auto;padding:12px 20px;font-size:11px;color:var(--text-dim);text-decoration:none;font-family:'JetBrains Mono',monospace;letter-spacing:1px;text-transform:uppercase;transition:color .2s;}
.adm-back:hover{color:var(--accent);}
.adm-content{overflow-y:auto;padding:28px 32px;}
.adm-content::-webkit-scrollbar{width:5px;}
.adm-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}
@media(max-width:800px){.adm-page{grid-template-columns:1fr;}.adm-sidebar{display:none;}}
`

export default function AdminLayout() {
  const navigate = useNavigate()

  useEffect(() => {
    const id = 'admin-layout-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = ADMIN_CSS
      document.head.appendChild(style)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  return (
    <div className="adm-page">
      <div className="adm-sidebar">
        <div className="adm-sb-title">Admin Panel</div>
        <nav className="adm-nav">
          <NavLink to="/admin/templates" className={({ isActive }) => `adm-nav-link${isActive ? ' active' : ''}`}>
            <span className="adm-nav-icon">🧩</span> Templates
          </NavLink>
          <NavLink to="/admin/brand" className={({ isActive }) => `adm-nav-link${isActive ? ' active' : ''}`}>
            <span className="adm-nav-icon">🎨</span> Brand
          </NavLink>
          <NavLink to="/admin/analytics" className={({ isActive }) => `adm-nav-link${isActive ? ' active' : ''}`}>
            <span className="adm-nav-icon">📊</span> Analytics
          </NavLink>
          <NavLink to="/admin/sandbox" className={({ isActive }) => `adm-nav-link${isActive ? ' active' : ''}`}>
            <span className="adm-nav-icon">🧪</span> Sandbox
          </NavLink>
          <NavLink to="/admin/infographic" className={({ isActive }) => `adm-nav-link${isActive ? ' active' : ''}`}>
            <span className="adm-nav-icon">🖼️</span> Infographic
          </NavLink>
        </nav>
        <a className="adm-back" href="/" onClick={e => { e.preventDefault(); navigate('/') }}>
          ← Back to App
        </a>
      </div>
      <div className="adm-content">
        <Outlet />
      </div>
    </div>
  )
}
