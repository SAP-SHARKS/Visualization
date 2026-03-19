import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import ThemeToggle from './components/ThemeToggle'
import UploadPage from './pages/UploadPage'
import VisualizePage from './pages/VisualizePage'
import LivePage from './pages/LivePage'
import HistoryPage from './pages/HistoryPage'
import Visualize2Page from './pages/Visualize2Page'
import LivePage2 from './pages/LivePage2'

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const TemplateList = lazy(() => import('./pages/admin/TemplateList'))
const TemplateEditor = lazy(() => import('./pages/admin/TemplateEditor'))
const BrandSettings = lazy(() => import('./pages/admin/BrandSettings'))
const Analytics = lazy(() => import('./pages/admin/Analytics'))
const TestSandbox = lazy(() => import('./pages/admin/TestSandbox'))
const InfographicSettings = lazy(() => import('./pages/admin/InfographicSettings'))

export default function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/visualize" element={<VisualizePage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/live2" element={<LivePage2 />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/visualize2" element={<Visualize2Page />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<TemplateList />} />
            <Route path="templates" element={<TemplateList />} />
            <Route path="templates/:id" element={<TemplateEditor />} />
            <Route path="brand" element={<BrandSettings />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="sandbox" element={<TestSandbox />} />
            <Route path="infographic" element={<InfographicSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ThemeToggle />
    </ThemeProvider>
  )
}
