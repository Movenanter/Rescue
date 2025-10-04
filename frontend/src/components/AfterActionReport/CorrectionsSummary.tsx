import React from 'react'
import { 
  AlertCircle, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  BookOpen,
  ChevronRight
} from 'lucide-react'
import { Correction } from '@/types/session'

interface CorrectionsSummaryProps {
  corrections: Correction[]
  recommendations: string[]
}

const CorrectionsSummary: React.FC<CorrectionsSummaryProps> = ({ corrections, recommendations }) => {
  const groupedCorrections = corrections.reduce((acc, correction) => {
    if (!acc[correction.type]) {
      acc[correction.type] = []
    }
    acc[correction.type].push(correction)
    return acc
  }, {} as Record<string, Correction[]>)

  const severityCounts = corrections.reduce((acc, correction) => {
    acc[correction.severity] = (acc[correction.severity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const getCorrectionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hand_position: 'Hand Position',
      compression_depth: 'Compression Depth',
      compression_rate: 'Compression Rate',
      breath_technique: 'Breath Technique',
      timing: 'Timing'
    }
    return labels[type] || type
  }

  const getCorrectionTypeIcon = (type: string) => {
    switch (type) {
      case 'hand_position': return '👐'
      case 'compression_depth': return '📏'
      case 'compression_rate': return '⏱️'
      case 'breath_technique': return '💨'
      case 'timing': return '⏰'
      default: return '📌'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />
      case 'moderate': return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'minor': return <AlertCircle className="w-5 h-5 text-blue-600" />
      default: return <AlertCircle className="w-5 h-5 text-primary-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2 text-primary-900">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <span>Corrections Summary</span>
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-red-100 border border-red-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <XCircle className="w-6 h-6 text-red-600" />
              <span className="text-3xl font-bold text-red-600">{severityCounts.critical || 0}</span>
            </div>
            <p className="text-sm text-primary-600 mt-2">Critical</p>
          </div>
          
          <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <span className="text-3xl font-bold text-yellow-600">{severityCounts.moderate || 0}</span>
            </div>
            <p className="text-sm text-primary-600 mt-2">Moderate</p>
          </div>
          
          <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              <span className="text-3xl font-bold text-blue-600">{severityCounts.minor || 0}</span>
            </div>
            <p className="text-sm text-primary-600 mt-2">Minor</p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedCorrections).map(([type, typeCorrections]) => (
            <div key={type} className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-primary-200 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getCorrectionTypeIcon(type)}</span>
                  <h3 className="font-medium text-primary-900">{getCorrectionTypeLabel(type)}</h3>
                </div>
                <span className="text-sm text-primary-600">{typeCorrections.length} corrections</span>
              </div>
              
              <div className="space-y-2">
                {typeCorrections.slice(0, 3).map((correction) => (
                  <div key={correction.id} className="flex items-start space-x-2 p-2 bg-white/50 rounded-lg backdrop-blur-sm border border-primary-100">
                    {getSeverityIcon(correction.severity)}
                    <div className="flex-1">
                      <p className="text-sm text-primary-700">{correction.description}</p>
                      {correction.compressionCount && (
                        <p className="text-xs text-primary-600 mt-1">
                          Affected {correction.compressionCount} compressions
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {typeCorrections.length > 3 && (
                  <p className="text-xs text-primary-600 pl-2">
                    +{typeCorrections.length - 3} more corrections
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-primary-900">
            <BookOpen className="w-5 h-5 text-primary-700" />
            <span>Training Recommendations</span>
          </h3>
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg border border-primary-100 backdrop-blur-sm shadow-sm">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 border border-purple-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-primary-700">{recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
        <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2 text-primary-900">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <span>Next Steps</span>
        </h3>
        <ul className="space-y-2">
          <li className="flex items-center space-x-2">
            <ChevronRight className="w-4 h-4 text-green-600" />
            <span className="text-sm text-primary-700">Review the timeline to understand when corrections occurred</span>
          </li>
          <li className="flex items-center space-x-2">
            <ChevronRight className="w-4 h-4 text-green-600" />
            <span className="text-sm text-primary-700">Practice the recommended focus areas in your next session</span>
          </li>
          <li className="flex items-center space-x-2">
            <ChevronRight className="w-4 h-4 text-green-600" />
            <span className="text-sm text-primary-700">Export this report as PDF for your records</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default CorrectionsSummary