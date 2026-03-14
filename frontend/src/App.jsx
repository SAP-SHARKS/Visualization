import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import ThemeToggle from './components/ThemeToggle'
import UploadPage from './pages/UploadPage'
import VisualizePage from './pages/VisualizePage'
import LivePage from './pages/LivePage'
import HistoryPage from './pages/HistoryPage'
import Visualize2Page from './pages/Visualize2Page'
import LivePage2 from './pages/LivePage2'

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/visualize" element={<VisualizePage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/live2" element={<LivePage2 />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/visualize2" element={<Visualize2Page />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ThemeToggle />
    </ThemeProvider>
  )
}
