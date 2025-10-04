import { Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import AfterActionReportPage from './pages/AfterActionReportPage'
import ProfileSettingsPage from './pages/ProfileSettingsPage'
import TrainingSession from './components/TrainingSession'

function App() {
  return (
    <div className="min-h-screen bg-primary-50">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/training" element={<TrainingSession />} />
        <Route path="/report/:sessionId" element={<AfterActionReportPage />} />
        <Route path="/profile" element={<ProfileSettingsPage />} />
      </Routes>
    </div>
  )
}

export default App