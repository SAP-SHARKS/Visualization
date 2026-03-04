import { Routes, Route, Navigate } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import VisualizePage from './pages/VisualizePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/visualize" element={<VisualizePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
