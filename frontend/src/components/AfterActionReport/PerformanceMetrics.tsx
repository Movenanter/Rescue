import React from 'react'
import { 
  TrendingUp, 
  Activity, 
  Heart,
  Timer
} from 'lucide-react'
import { CPRSession } from '@/types/session'

interface PerformanceMetricsProps {
  session: CPRSession
  summary: {
    totalDuration: number
    totalCorrections: number
    criticalErrors: number
    performanceScore: number
    strengths: string[]
    areasForImprovement: string[]
  }
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ session, summary }) => {
  const compressionRateStatus = session.avgCompressionRate >= 100 && session.avgCompressionRate <= 120 ? 'optimal' : 
    session.avgCompressionRate < 100 ? 'too_slow' : 'too_fast'
  
  const compressionDepthStatus = session.avgCompressionDepth >= 5 && session.avgCompressionDepth <= 6 ? 'optimal' :
    session.avgCompressionDepth < 5 ? 'too_shallow' : 'too_deep'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-700 bg-green-100 border-green-300'
      case 'too_slow':
      case 'too_shallow': return 'text-yellow-700 bg-yellow-100 border-yellow-300'
      case 'too_fast':
      case 'too_deep': return 'text-red-700 bg-red-100 border-red-300'
      default: return 'text-primary-600 bg-white/50 border-primary-200'
    }
  }

  const CircularProgress = ({ value, max, label, color }: any) => {
    const percentage = (value / max) * 100
    const strokeDasharray = 2 * Math.PI * 45
    const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100

    return (
      <div className="relative w-32 h-32">
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-primary-300"
          />
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`${color} transition-all duration-500`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-primary-900">{value}</span>
          <span className="text-xs text-primary-600">{label}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
        <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2 text-primary-900">
          <TrendingUp className="w-5 h-5 text-primary-700" />
          <span>Performance Metrics</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center">
            <CircularProgress 
              value={session.avgCompressionRate} 
              max={150} 
              label="CPM"
              color={compressionRateStatus === 'optimal' ? 'text-green-600' : 'text-yellow-600'}
            />
            <div className="mt-4 text-center">
              <div className="text-sm font-medium text-primary-700">Compression Rate</div>
              <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${getStatusColor(compressionRateStatus)}`}>
                {compressionRateStatus === 'optimal' ? 'Optimal' : 
                 compressionRateStatus === 'too_slow' ? 'Too Slow' : 'Too Fast'}
              </div>
              <div className="text-xs text-primary-600 mt-1">Target: 100-120 CPM</div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <CircularProgress 
              value={session.avgCompressionDepth} 
              max={8} 
              label="cm"
              color={compressionDepthStatus === 'optimal' ? 'text-green-600' : 'text-yellow-600'}
            />
            <div className="mt-4 text-center">
              <div className="text-sm font-medium text-primary-700">Compression Depth</div>
              <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${getStatusColor(compressionDepthStatus)}`}>
                {compressionDepthStatus === 'optimal' ? 'Optimal' : 
                 compressionDepthStatus === 'too_shallow' ? 'Too Shallow' : 'Too Deep'}
              </div>
              <div className="text-xs text-primary-600 mt-1">Target: 5-6 cm</div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <CircularProgress 
              value={summary.performanceScore} 
              max={100} 
              label="%"
              color={summary.performanceScore >= 80 ? 'text-green-600' : 
                     summary.performanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'}
            />
            <div className="mt-4 text-center">
              <div className="text-sm font-medium text-primary-700">Overall Score</div>
              <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${
                summary.performanceScore >= 80 ? 'text-green-700 bg-green-100 border-green-300' :
                summary.performanceScore >= 60 ? 'text-yellow-700 bg-yellow-100 border-yellow-300' :
                'text-red-700 bg-red-100 border-red-300'
              }`}>
                {summary.performanceScore >= 80 ? 'Excellent' :
                 summary.performanceScore >= 60 ? 'Good' : 'Needs Improvement'}
              </div>
              <div className="text-xs text-primary-600 mt-1">Pass: ≥70%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-primary-900">
            <Activity className="w-5 h-5 text-primary-700" />
            <span>Compression Analysis</span>
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary-600">Total Compressions</span>
              <span className="text-xl font-bold text-primary-900">{session.totalCompressions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary-600">Compression:Breath Ratio</span>
              <span className="text-xl font-bold text-primary-900">30:2</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary-600">Full Cycles Completed</span>
              <span className="text-xl font-bold text-primary-900">{Math.floor(session.totalCompressions / 30)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-primary-900">
            <Heart className="w-5 h-5 text-primary-700" />
            <span>Ventilation Analysis</span>
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary-600">Total Breaths</span>
              <span className="text-xl font-bold text-primary-900">{session.totalBreaths}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary-600">Avg Breath Duration</span>
              <span className="text-xl font-bold text-primary-900">1.2s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary-600">Proper Seal</span>
              <span className="text-xl font-bold text-green-600">92%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-primary-900">
          <Timer className="w-5 h-5 text-primary-700" />
          <span>Time Distribution</span>
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-primary-600">Compressions</span>
              <span className="text-primary-800">75%</span>
            </div>
            <div className="w-full bg-primary-200 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '75%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-primary-600">Ventilations</span>
              <span className="text-primary-800">15%</span>
            </div>
            <div className="w-full bg-primary-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '15%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-primary-600">Pauses/Interruptions</span>
              <span className="text-primary-800">10%</span>
            </div>
            <div className="w-full bg-primary-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: '10%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerformanceMetrics