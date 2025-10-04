import React, { useState, useRef } from 'react'
import { format } from 'date-fns'
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Download,
  Activity,
  Target,
  Award,
  ChevronRight,
  Calendar,
  User,
  FileText
} from 'lucide-react'
import { AfterActionReport as ReportType } from '@/types/session'
import { exportToPDF } from '@/utils/pdfExport'
import TimelineView from './TimelineView'
import PerformanceMetrics from './PerformanceMetrics'
import CorrectionsSummary from './CorrectionsSummary'

interface AfterActionReportProps {
  report: ReportType
  userName?: string
}

const AfterActionReport: React.FC<AfterActionReportProps> = ({ report, userName = 'Trainee' }) => {
  const [activeView, setActiveView] = useState<'timeline' | 'performance' | 'corrections'>('timeline')
  const reportRef = useRef<HTMLDivElement>(null)

  const handleExportPDF = async () => {
    if (reportRef.current) {
      await exportToPDF(reportRef.current, report, userName)
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }


  return (
    <div className="min-h-screen bg-primary-50 text-primary-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-primary-700" />
              <h1 className="text-3xl font-bold">After-Action Report</h1>
            </div>
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">Export PDF</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-primary-600">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>{userName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{format(report.session.startTime, 'MMM d, yyyy • h:mm a')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(report.summary.totalDuration)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-6 h-6 text-primary-700" />
              <span className="text-2xl font-bold">{report.summary.performanceScore}%</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-primary-600">Performance Score</div>
              <div className="w-full bg-primary-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${report.summary.performanceScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-6 h-6 text-primary-700" />
              <span className="text-2xl font-bold">{report.session.totalCompressions}</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-primary-600">Total Compressions</div>
              <div className="text-xs text-primary-500">
                Avg Rate: {report.session.avgCompressionRate} cpm
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-6 h-6 text-primary-700" />
              <span className="text-2xl font-bold">{report.summary.totalCorrections}</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-primary-600">Total Corrections</div>
              <div className="text-xs text-primary-500">
                {report.summary.criticalErrors} critical
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-6 h-6 text-primary-700" />
              <span className={`text-2xl font-bold ${report.session.certification?.passed ? 'text-green-600' : 'text-red-600'}`}>
                {report.session.certification?.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-primary-600">Certification Status</div>
              {report.session.certification?.certificateId && (
                <div className="text-xs text-primary-500">
                  ID: {report.session.certification.certificateId}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex space-x-4 mb-6">
          {['timeline', 'performance', 'corrections'].map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${
                activeView === view
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white/70 text-primary-600 hover:bg-white/90 border border-primary-200'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>

        <div ref={reportRef} className="space-y-6">
          {activeView === 'timeline' && (
            <TimelineView steps={report.timeline} />
          )}
          
          {activeView === 'performance' && (
            <PerformanceMetrics session={report.session} summary={report.summary} />
          )}
          
          {activeView === 'corrections' && (
            <CorrectionsSummary 
              corrections={report.timeline.flatMap(step => step.corrections || [])}
              recommendations={report.recommendations}
            />
          )}
        </div>

        {report.summary.strengths.length > 0 && (
          <div className="mt-8 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
              <span>Strengths</span>
            </h3>
            <ul className="space-y-2">
              {report.summary.strengths.map((strength, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span className="text-sm text-primary-700">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.summary.areasForImprovement.length > 0 && (
          <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Target className="w-5 h-5 text-yellow-600" />
              <span>Areas for Improvement</span>
            </h3>
            <ul className="space-y-2">
              {report.summary.areasForImprovement.map((area, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <span className="text-sm text-primary-700">{area}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default AfterActionReport