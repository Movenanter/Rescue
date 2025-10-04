import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import AfterActionReportPage from './pages/AfterActionReportPage'
import TrainingSession from './components/TrainingSession'

function App() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/training" element={<TrainingSession />} />
        <Route path="/report/:sessionId" element={<AfterActionReportPage />} />
      </Routes>
    </div>
  )
}

export default App