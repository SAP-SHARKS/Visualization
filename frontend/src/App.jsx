import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import ThemeToggle from './components/ThemeToggle'
import UploadPage from './pages/UploadPage'
import VisualizePage from './pages/VisualizePage'
import LivePage from './pages/LivePage'

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/visualize" element={<VisualizePage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ThemeToggle />
    </ThemeProvider>
  )
}
