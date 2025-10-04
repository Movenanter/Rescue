import React from 'react'
import { format } from 'date-fns'
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  Wind,
  Hand
} from 'lucide-react'
import { SessionStep } from '@/types/session'

interface TimelineViewProps {
  steps: SessionStep[]
}

const TimelineView: React.FC<TimelineViewProps> = ({ steps }) => {
  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('compression')) return <Activity className="w-4 h-4" />
    if (action.toLowerCase().includes('breath')) return <Wind className="w-4 h-4" />
    if (action.toLowerCase().includes('position')) return <Hand className="w-4 h-4" />
    return <CheckCircle className="w-4 h-4" />
  }

  const getCorrectionIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4 text-red-400" />
      case 'moderate': return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'minor': return <AlertTriangle className="w-4 h-4 text-blue-400" />
      default: return <AlertTriangle className="w-4 h-4 text-gray-400" />
    }
  }

  const getCorrectionColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-950/50'
      case 'moderate': return 'border-yellow-500 bg-yellow-950/50'
      case 'minor': return 'border-blue-500 bg-blue-950/50'
      default: return 'border-gray-600 bg-gray-900'
    }
  }

  const getPerformanceIndicator = (performance: SessionStep['performance']) => {
    if (!performance) return null
    
    const indicators = []
    if (performance.compressionRate) {
      const isGood = performance.compressionRate >= 100 && performance.compressionRate <= 120
      indicators.push(
        <div key="rate" className={`text-xs ${isGood ? 'text-green-400' : 'text-yellow-400'}`}>
          Rate: {performance.compressionRate} cpm
        </div>
      )
    }
    if (performance.compressionDepth) {
      const isGood = performance.compressionDepth >= 5 && performance.compressionDepth <= 6
      indicators.push(
        <div key="depth" className={`text-xs ${isGood ? 'text-green-400' : 'text-yellow-400'}`}>
          Depth: {performance.compressionDepth} cm
        </div>
      )
    }
    if (performance.handPosition) {
      indicators.push(
        <div key="position" className={`text-xs ${performance.handPosition === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
          Hand Position: {performance.handPosition}
        </div>
      )
    }
    return indicators.length > 0 ? <div className="flex flex-wrap gap-3 mt-2">{indicators}</div> : null
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
        <Clock className="w-5 h-5 text-lime-400" />
        <span>Session Timeline</span>
      </h2>
      
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-700" />
        
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="relative flex items-start">
              <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-700">
                <div className="text-center">
                  <div className="text-xs text-gray-400">Step</div>
                  <div className="text-lg font-bold text-lime-400">{index + 1}</div>
                </div>
              </div>
              
              <div className="ml-6 flex-1">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(step.action)}
                      <h3 className="font-medium text-white">{step.action}</h3>
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(step.timestamp, 'h:mm:ss a')}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-3">{step.description}</p>
                  
                  {getPerformanceIndicator(step.performance)}
                  
                  {step.corrections && step.corrections.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Corrections Given
                      </div>
                      {step.corrections.map((correction) => (
                        <div
                          key={correction.id}
                          className={`p-3 rounded-lg border ${getCorrectionColor(correction.severity)}`}
                        >
                          <div className="flex items-start space-x-2">
                            {getCorrectionIcon(correction.severity)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">
                                  {correction.type.replace('_', ' ')}
                                </span>
                                {correction.compressionCount && (
                                  <span className="text-xs text-gray-400">
                                    {correction.compressionCount} compressions affected
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-300">{correction.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TimelineView