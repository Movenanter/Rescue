import React, { useState, useRef } from 'react'
import { format } from 'date-fns'
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  Download,
  Activity,
  Target,
  Award,
  ChevronRight,
  Calendar,
  User,
  BarChart3,
  FileText
} from 'lucide-react'
import { AfterActionReport as ReportType, Correction, SessionStep } from '@/types/session'
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400'
      case 'moderate': return 'text-yellow-400'
      case 'minor': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-lime-400" />
              <h1 className="text-3xl font-bold">After-Action Report</h1>
            </div>
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-2 px-4 py-2 bg-lime-400 text-gray-900 rounded-lg hover:bg-lime-300 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">Export PDF</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-400">
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
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-6 h-6 text-lime-400" />
              <span className="text-2xl font-bold">{report.summary.performanceScore}%</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Performance Score</div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-lime-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${report.summary.performanceScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-6 h-6 text-blue-400" />
              <span className="text-2xl font-bold">{report.session.totalCompressions}</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Total Compressions</div>
              <div className="text-xs text-gray-500">
                Avg Rate: {report.session.avgCompressionRate} cpm
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold">{report.summary.totalCorrections}</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Total Corrections</div>
              <div className="text-xs text-gray-500">
                {report.summary.criticalErrors} critical
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-6 h-6 text-green-400" />
              <span className={`text-2xl font-bold ${report.session.certification?.passed ? 'text-green-400' : 'text-red-400'}`}>
                {report.session.certification?.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Certification Status</div>
              {report.session.certification?.certificateId && (
                <div className="text-xs text-gray-500">
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
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeView === view
                  ? 'bg-lime-400 text-gray-900'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
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
          <div className="mt-8 bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span>Strengths</span>
            </h3>
            <ul className="space-y-2">
              {report.summary.strengths.map((strength, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                  <span className="text-sm text-gray-300">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.summary.areasForImprovement.length > 0 && (
          <div className="mt-6 bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Target className="w-5 h-5 text-yellow-400" />
              <span>Areas for Improvement</span>
            </h3>
            <ul className="space-y-2">
              {report.summary.areasForImprovement.map((area, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <ChevronRight className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <span className="text-sm text-gray-300">{area}</span>
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