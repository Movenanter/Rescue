import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Play, 
  Pause, 
  StopCircle,
  Activity,
  Wind,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

const TrainingSession: React.FC = () => {
  const navigate = useNavigate()
  const [isRunning, setIsRunning] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)
  const [compressionCount, setCompressionCount] = useState(0)
  const [breathCount, setBreathCount] = useState(0)
  const [currentRate, setCurrentRate] = useState(0)
  const [currentDepth, setCurrentDepth] = useState(0)
  const [feedback, setFeedback] = useState<string[]>([])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRunning) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1)
        
        // Simulate compressions and feedback
        if (Math.random() > 0.7) {
          setCompressionCount(prev => prev + 1)
          setCurrentRate(100 + Math.floor(Math.random() * 20))
          setCurrentDepth(4.5 + Math.random() * 2)
        }
      }, 1000)
    } else if (!isRunning && interval) {
      clearInterval(interval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    setIsRunning(true)
    setFeedback(prev => [...prev, 'Session started - begin chest compressions'])
  }

  const handlePause = () => {
    setIsRunning(false)
    setFeedback(prev => [...prev, 'Session paused'])
  }

  const handleStop = () => {
    setIsRunning(false)
    // In production, this would save the session and generate a report
    navigate('/report/session-001')
  }

  const getRateStatus = () => {
    if (currentRate === 0) return { color: 'text-gray-400', status: 'Ready' }
    if (currentRate >= 100 && currentRate <= 120) return { color: 'text-green-400', status: 'Optimal' }
    if (currentRate < 100) return { color: 'text-yellow-400', status: 'Too Slow' }
    return { color: 'text-red-400', status: 'Too Fast' }
  }

  const getDepthStatus = () => {
    if (currentDepth === 0) return { color: 'text-gray-400', status: 'Ready' }
    if (currentDepth >= 5 && currentDepth <= 6) return { color: 'text-green-400', status: 'Optimal' }
    if (currentDepth < 5) return { color: 'text-yellow-400', status: 'Too Shallow' }
    return { color: 'text-red-400', status: 'Too Deep' }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">CPR Training Session</h1>
          <p className="text-gray-400">Real-time feedback and guidance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Display */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer and Controls */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
              <div className="text-center mb-8">
                <div className="text-6xl font-mono font-bold text-lime-400 mb-2">
                  {formatTime(sessionTime)}
                </div>
                <p className="text-gray-400">Session Duration</p>
              </div>

              <div className="flex justify-center space-x-4">
                {!isRunning ? (
                  <button
                    onClick={handleStart}
                    className="flex items-center space-x-2 px-6 py-3 bg-lime-400 text-gray-900 rounded-lg hover:bg-lime-300 transition-colors"
                  >
                    <Play className="w-5 h-5" />
                    <span className="font-medium">Start Session</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePause}
                      className="flex items-center space-x-2 px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 transition-colors"
                    >
                      <Pause className="w-5 h-5" />
                      <span className="font-medium">Pause</span>
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-400 text-gray-900 rounded-lg hover:bg-red-300 transition-colors"
                    >
                      <StopCircle className="w-5 h-5" />
                      <span className="font-medium">End Session</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Compression Rate</h3>
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-4xl font-bold mb-2">{currentRate || '--'}</div>
                <div className="text-sm text-gray-400 mb-4">CPM (Target: 100-120)</div>
                <div className={`text-sm font-medium ${getRateStatus().color}`}>
                  {getRateStatus().status}
                </div>
              </div>

              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Compression Depth</h3>
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-4xl font-bold mb-2">{currentDepth ? currentDepth.toFixed(1) : '--'}</div>
                <div className="text-sm text-gray-400 mb-4">cm (Target: 5-6)</div>
                <div className={`text-sm font-medium ${getDepthStatus().color}`}>
                  {getDepthStatus().status}
                </div>
              </div>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5 text-lime-400" />
                  <span className="text-3xl font-bold">{compressionCount}</span>
                </div>
                <p className="text-sm text-gray-400">Total Compressions</p>
              </div>

              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <Wind className="w-5 h-5 text-cyan-400" />
                  <span className="text-3xl font-bold">{breathCount}</span>
                </div>
                <p className="text-sm text-gray-400">Total Breaths</p>
              </div>
            </div>
          </div>

          {/* Feedback Panel */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <span>Real-time Feedback</span>
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {feedback.length === 0 ? (
                  <p className="text-gray-500 text-sm">Feedback will appear here during your session</p>
                ) : (
                  feedback.slice(-5).reverse().map((item, index) => (
                    <div key={index} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                        <p className="text-sm text-gray-300">{item}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-950/20 to-purple-950/20 border border-blue-900 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3">Current Phase</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-300">Chest Compressions</span>
                </div>
                <p className="text-xs text-gray-500">30 compressions at 100-120 CPM</p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-3">Tips</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Press hard and fast</li>
                <li>• Allow complete chest recoil</li>
                <li>• Minimize interruptions</li>
                <li>• Maintain proper hand position</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrainingSession