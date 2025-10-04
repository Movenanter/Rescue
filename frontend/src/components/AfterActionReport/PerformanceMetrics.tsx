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
      case 'optimal': return 'text-green-400 bg-green-950/50 border-green-500'
      case 'too_slow':
      case 'too_shallow': return 'text-yellow-400 bg-yellow-950/50 border-yellow-500'
      case 'too_fast':
      case 'too_deep': return 'text-red-400 bg-red-950/50 border-red-500'
      default: return 'text-gray-400 bg-gray-900 border-gray-700'
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
            className="text-gray-700"
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
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-xs text-gray-400">{label}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-lime-400" />
          <span>Performance Metrics</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center">
            <CircularProgress 
              value={session.avgCompressionRate} 
              max={150} 
              label="CPM"
              color={compressionRateStatus === 'optimal' ? 'text-green-400' : 'text-yellow-400'}
            />
            <div className="mt-4 text-center">
              <div className="text-sm font-medium text-gray-300">Compression Rate</div>
              <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${getStatusColor(compressionRateStatus)}`}>
                {compressionRateStatus === 'optimal' ? 'Optimal' : 
                 compressionRateStatus === 'too_slow' ? 'Too Slow' : 'Too Fast'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Target: 100-120 CPM</div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <CircularProgress 
              value={session.avgCompressionDepth} 
              max={8} 
              label="cm"
              color={compressionDepthStatus === 'optimal' ? 'text-green-400' : 'text-yellow-400'}
            />
            <div className="mt-4 text-center">
              <div className="text-sm font-medium text-gray-300">Compression Depth</div>
              <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${getStatusColor(compressionDepthStatus)}`}>
                {compressionDepthStatus === 'optimal' ? 'Optimal' : 
                 compressionDepthStatus === 'too_shallow' ? 'Too Shallow' : 'Too Deep'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Target: 5-6 cm</div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <CircularProgress 
              value={summary.performanceScore} 
              max={100} 
              label="%"
              color={summary.performanceScore >= 80 ? 'text-green-400' : 
                     summary.performanceScore >= 60 ? 'text-yellow-400' : 'text-red-400'}
            />
            <div className="mt-4 text-center">
              <div className="text-sm font-medium text-gray-300">Overall Score</div>
              <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${
                summary.performanceScore >= 80 ? 'text-green-400 bg-green-950/50 border-green-500' :
                summary.performanceScore >= 60 ? 'text-yellow-400 bg-yellow-950/50 border-yellow-500' :
                'text-red-400 bg-red-950/50 border-red-500'
              }`}>
                {summary.performanceScore >= 80 ? 'Excellent' :
                 summary.performanceScore >= 60 ? 'Good' : 'Needs Improvement'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Pass: ≥70%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span>Compression Analysis</span>
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Total Compressions</span>
              <span className="text-xl font-bold">{session.totalCompressions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Compression:Breath Ratio</span>
              <span className="text-xl font-bold">30:2</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Full Cycles Completed</span>
              <span className="text-xl font-bold">{Math.floor(session.totalCompressions / 30)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-400" />
            <span>Ventilation Analysis</span>
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Total Breaths</span>
              <span className="text-xl font-bold">{session.totalBreaths}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Avg Breath Duration</span>
              <span className="text-xl font-bold">1.2s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Proper Seal</span>
              <span className="text-xl font-bold text-green-400">92%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Timer className="w-5 h-5 text-purple-400" />
          <span>Time Distribution</span>
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Compressions</span>
              <span className="text-gray-300">75%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-purple-400 h-2 rounded-full" style={{ width: '75%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Ventilations</span>
              <span className="text-gray-300">15%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-blue-400 h-2 rounded-full" style={{ width: '15%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Pauses/Interruptions</span>
              <span className="text-gray-300">10%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-red-400 h-2 rounded-full" style={{ width: '10%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerformanceMetrics