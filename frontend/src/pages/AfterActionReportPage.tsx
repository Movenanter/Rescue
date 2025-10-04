import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AfterActionReport from '@/components/AfterActionReport/AfterActionReport'
import { AfterActionReport as ReportType } from '@/types/session'
import { mockReport } from '@/data/mockData'
import { apiService } from '@/services/api'

const AfterActionReportPage: React.FC = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState<ReportType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        
        // Try to get session from backend first, fallback to mock data
        try {
          await apiService.getSession(sessionId!)
          // If backend call succeeds, implement backend session retrieval here
        } catch (backendError) {
          console.warn('Backend session retrieval not available:', backendError)
          // Generate AI summary for mock report if backend is available
          if (mockReport) {
            try {
              const aiSummary = await apiService.generateSummary(sessionId!, {
                totalCorrections: mockReport.summary.totalCorrections,
                criticalErrors: mockReport.summary.criticalErrors,
                performanceScore: mockReport.summary.performanceScore,
                durationMinutes: Math.round(mockReport.summary.totalDuration / 60000),
                totalCompressions: mockReport.session.totalCompressions,
                corrections: mockReport.timeline.flatMap(step => step.corrections || [])
              })
              
              // Update mock report with AI summary
              const enhancedReport = {
                ...mockReport,
                summary: {
                  ...mockReport.summary,
                  aiGenerated: aiSummary
                }
              }
              setReport(enhancedReport)
            } catch (aiError) {
              console.warn('AI summary generation failed:', aiError)
              setReport(mockReport)
            }
          }
        }
        
        setLoading(false)
      } catch (err) {
        setError('Failed to load report')
        setLoading(false)
      }
    }

    if (sessionId) {
      fetchReport()
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-primary-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Report not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-primary-200 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-primary-600 hover:text-primary-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
      
      <AfterActionReport report={report} userName="John Doe" />
    </div>
  )
}

export default AfterActionReportPage