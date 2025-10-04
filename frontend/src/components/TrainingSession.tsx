import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Play, 
  Pause, 
  StopCircle,
  Activity,
  Wind,
  AlertCircle,
  CheckCircle,
  BookOpen,
  Trophy,
  ArrowLeft,
  Camera,
  Upload,
  Loader2
} from 'lucide-react'
import { apiService } from '../services/api'

const TrainingSession: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [trialType, setTrialType] = useState<'practice' | 'real'>('practice')
  const [sessionSetupComplete, setSessionSetupComplete] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)
  const [compressionCount, setCompressionCount] = useState(0)
  const [breathCount] = useState(0)
  const [currentRate, setCurrentRate] = useState(0)
  const [currentDepth, setCurrentDepth] = useState(0)
  const [feedback, setFeedback] = useState<string[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [backendConnected, setBackendConnected] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any[]>([])
  
  // Initialize backend connection check
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        await apiService.healthCheck()
        setBackendConnected(true)
        console.log('Backend connected for training session')
      } catch (error) {
        setBackendConnected(false)
        console.warn('Backend not available for training session:', error)
      }
    }
    
    checkBackendConnection()
  }, [])

  useEffect(() => {
    // Check if trial type was passed via URL params
    const urlTrialType = searchParams.get('trialType') as 'practice' | 'real' | null
    if (urlTrialType) {
      setTrialType(urlTrialType)
      setSessionSetupComplete(true)
    }
  }, [searchParams])

  useEffect(() => {
    let interval: number | null = null
    
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!backendConnected) {
      setFeedback(prev => [...prev, 'AI analysis unavailable - backend not connected'])
      return
    }

    setAnalyzing(true)
    try {
      const result = await apiService.analyzeHands(file)
      
      // Update metrics based on analysis
      if (result.metrics) {
        setCurrentDepth(result.metrics.depth_inches)
        setCurrentRate(result.metrics.quality_percent * 1.2) // Convert quality to approximate rate
      }
      
      // Add feedback
      const feedbackMessage = result.guidance || result.analysis?.position || 'Analysis complete'
      setFeedback(prev => [...prev, feedbackMessage])
      
      // Store analysis result
      setAnalysisResults(prev => [...prev, {
        timestamp: new Date(),
        result: result
      }])
      
    } catch (error) {
      console.error('Analysis failed:', error)
      setFeedback(prev => [...prev, 'Analysis failed - using session metrics'])
    } finally {
      setAnalyzing(false)
    }
  }

  const triggerImageCapture = () => {
    fileInputRef.current?.click()
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

  // Session setup UI
  if (!sessionSetupComplete) {
    return (
      <div className="min-h-screen bg-primary-50 text-primary-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-800 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-bold mb-2">Start New Training Session</h1>
            <p className="text-primary-600">Choose your trial type and begin your CPR training</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Practice Trial */}
            <div className={`bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-primary-200 shadow-lg hover:shadow-xl transition-all cursor-pointer ${
              trialType === 'practice' ? 'border-blue-300 shadow-blue-100' : 'hover:border-blue-200'
            }`}
                 onClick={() => setTrialType('practice')}>
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  trialType === 'practice' ? 'bg-blue-500 text-white shadow-lg' : 'bg-blue-100 text-blue-600'
                }`}>
                  <BookOpen className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">Practice Trial</h2>
                <p className="text-primary-600 mb-4">Perfect for skill development and learning</p>
                <ul className="text-sm text-primary-500 text-left space-y-2">
                  <li>• No pressure environment</li>
                  <li>• Learn and experiment</li>
                  <li>• Detailed feedback</li>
                  <li>• Unlimited attempts</li>
                  <li>• Progress tracking</li>
                </ul>
              </div>
            </div>

            {/* Real Trial */}
            <div className={`bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-primary-200 shadow-lg hover:shadow-xl transition-all cursor-pointer ${
              trialType === 'real' ? 'border-red-300 shadow-red-100' : 'hover:border-red-200'
            }`}
                 onClick={() => setTrialType('real')}>
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  trialType === 'real' ? 'bg-red-500 text-white shadow-lg' : 'bg-red-100 text-red-600'
                }`}>
                  <Trophy className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">Real Trial</h2>
                <p className="text-primary-600 mb-4">Certification-level assessment</p>
                <ul className="text-sm text-primary-500 text-left space-y-2">
                  <li>• Official scoring</li>
                  <li>• Certification requirements</li>
                  <li>• Performance evaluation</li>
                  <li>• Pass/fail criteria</li>
                  <li>• Certificate generation</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setSessionSetupComplete(true)}
              className={`px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg ${
                trialType === 'practice' 
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              Start {trialType === 'practice' ? 'Practice' : 'Real'} Trial
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary-50 text-primary-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-primary-600 hover:text-primary-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-3xl font-bold">CPR Training Session</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              trialType === 'practice' 
                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              {trialType === 'practice' ? 'Practice Trial' : 'Real Trial'}
            </span>
          </div>
          <p className="text-primary-600">
            {trialType === 'practice' 
              ? 'Practice mode - perfect your technique without pressure'
              : 'Assessment mode - official evaluation for certification'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Display */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer and Controls */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-primary-200 shadow-lg">
              <div className="text-center mb-8">
                <div className="text-6xl font-mono font-bold text-primary-700 mb-2">
                  {formatTime(sessionTime)}
                </div>
                <p className="text-primary-600">Session Duration</p>
              </div>

              <div className="flex justify-center space-x-4">
                {!isRunning ? (
                  <button
                    onClick={handleStart}
                    className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg"
                  >
                    <Play className="w-5 h-5" />
                    <span className="font-medium">Start Session</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePause}
                      className="flex items-center space-x-2 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors shadow-lg"
                    >
                      <Pause className="w-5 h-5" />
                      <span className="font-medium">Pause</span>
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <StopCircle className="w-5 h-5" />
                      <span className="font-medium">End Session</span>
                    </button>
                  </>
                )}
              </div>

              {/* Image Capture Section */}
              <div className="mt-8 pt-6 border-t border-primary-200">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-primary-700 mb-4">AI Analysis Capture</h3>
                  <div className="flex justify-center space-x-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={triggerImageCapture}
                      disabled={analyzing || !backendConnected}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        backendConnected && !analyzing
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      }`}
                    >
                      {analyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">
                        {analyzing ? 'Analyzing...' : 'Capture Image'}
                      </span>
                    </button>
                    {backendConnected ? (
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>AI Ready</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>Demo Mode</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Compression Rate</h3>
                  <Activity className="w-5 h-5 text-primary-700" />
                </div>
                <div className="text-4xl font-bold mb-2">{currentRate || '--'}</div>
                <div className="text-sm text-primary-600 mb-4">CPM (Target: 100-120)</div>
                <div className={`text-sm font-medium ${
                  currentRate === 0 
                    ? 'text-primary-500' 
                    : currentRate >= 100 && currentRate <= 120 
                    ? 'text-green-600' 
                    : currentRate < 100 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
                }`}>
                  {getRateStatus().status}
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Compression Depth</h3>
                  <Activity className="w-5 h-5 text-primary-700" />
                </div>
                <div className="text-4xl font-bold mb-2">{currentDepth ? currentDepth.toFixed(1) : '--'}</div>
                <div className="text-sm text-primary-600 mb-4">cm (Target: 5-6)</div>
                <div className={`text-sm font-medium ${
                  currentDepth === 0 
                    ? 'text-primary-500' 
                    : currentDepth >= 5 && currentDepth <= 6 
                    ? 'text-green-600' 
                    : currentDepth < 5 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
                }`}>
                  {getDepthStatus().status}
                </div>
              </div>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5 text-primary-700" />
                  <span className="text-3xl font-bold">{compressionCount}</span>
                </div>
                <p className="text-sm text-primary-600">Total Compressions</p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Wind className="w-5 h-5 text-primary-700" />
                  <span className="text-3xl font-bold">{breathCount}</span>
                </div>
                <p className="text-sm text-primary-600">Total Breaths</p>
              </div>
            </div>
          </div>

          {/* Feedback Panel */}
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-primary-700" />
                <span>Real-time Feedback</span>
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {feedback.length === 0 ? (
                  <p className="text-primary-600 text-sm">Feedback will appear here during your session</p>
                ) : (
                  feedback.slice(-5).reverse().map((item, index) => (
                    <div key={index} className="p-3 bg-white/50 backdrop-blur-sm rounded-lg border border-primary-200 shadow-sm">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <p className="text-sm text-primary-700">{item}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm border border-primary-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-3 text-primary-700">Current Phase</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse" />
                  <span className="text-sm text-primary-700">Chest Compressions</span>
                </div>
                <p className="text-xs text-primary-600">30 compressions at 100-120 CPM</p>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
              <h3 className="text-lg font-semibold mb-3 text-primary-700">Tips</h3>
              <ul className="space-y-2 text-sm text-primary-600">
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