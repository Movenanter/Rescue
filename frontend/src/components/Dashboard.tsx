import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Activity, 
  Award, 
  Clock, 
  FileText,
  TrendingUp,
  Calendar,
  ChevronRight,
  Loader2,
  Camera,
  Eye
} from 'lucide-react'
import Header from './Header'
import TrialTypeSidebar from './TrialTypeSidebar'
import { mockSessions } from '../data/mockData'
import { apiService } from '../services/api'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [selectedTrialType, setSelectedTrialType] = useState<'practice' | 'real' | 'all'>('all')
  const [sessions, setSessions] = useState(mockSessions) // Fallback to mock data initially
  const [loading, setLoading] = useState(false)
  const [backendConnected, setBackendConnected] = useState(false)
  const [recentPhotos, setRecentPhotos] = useState<any[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [sessionsData, setSessionsData] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  
  // Real metrics from actual sessions
  const [sessionStats, setSessionStats] = useState({
    totalPhotos: 0,
    goodPositions: 0,
    poorPositions: 0,
    noCprDetected: 0,
    averageResponseTime: 0,
    lastSessionTime: null as string | null
  })
  
  const filteredSessions = useMemo(() => {
    if (selectedTrialType === 'all') return sessions
    return sessions.filter(session => session.trialType === selectedTrialType)
  }, [selectedTrialType, sessions])

  // Calculate real statistics from photo data
  const calculateRealStats = (photos: any[]) => {
    console.log('📊 Calculating stats from photos:', photos) // Debug log
    
    const totalPhotos = photos.length
    
    // Debug each photo's analysis data
    photos.forEach((photo, index) => {
      console.log(`Photo ${index}:`, {
        analysis: photo.analysis,
        guidance: photo.guidance,
        position: photo.analysis?.position,
        source: photo.analysis?.source
      })
    })
    
    const goodPositions = photos.filter(p => {
      const position = p.analysis?.position
      console.log(`Checking position "${position}" for good:`, position === 'good')
      return position === 'good'
    }).length
    
    const poorPositions = photos.filter(p => {
      const position = p.analysis?.position
      const isPoor = ['high', 'low', 'left', 'right', 'uncertain', 'unknown'].includes(position)
      console.log(`Checking position "${position}" for poor:`, isPoor)
      return isPoor
    }).length
    
    const noCprDetected = photos.filter(p => {
      const position = p.analysis?.position
      const isNoCpr = position === 'no_cpr'
      console.log(`Checking position "${position}" for no_cpr:`, isNoCpr)
      return isNoCpr
    }).length
    
    // Also check guidance text for "No CPR detected" as fallback
    const noCprFromGuidance = photos.filter(p => {
      const guidance = p.guidance?.instruction || p.guidance?.all_feedback?.[0] || ''
      const hasNoCpr = guidance.toLowerCase().includes('no cpr detected') || 
                      guidance.toLowerCase().includes('no cpr in progress')
      console.log(`Checking guidance "${guidance}" for no CPR:`, hasNoCpr)
      return hasNoCpr
    }).length
    
    // Use the higher count between position and guidance
    const finalNoCprCount = Math.max(noCprDetected, noCprFromGuidance)
    
    console.log('📈 Final stats:', {
      totalPhotos,
      goodPositions,
      poorPositions,
      noCprDetected: finalNoCprCount,
      noCprFromPosition: noCprDetected,
      noCprFromGuidance: noCprFromGuidance
    })
    
    const lastSessionTime = photos.length > 0 ? photos[0].timestamp : null
    
    return {
      totalPhotos,
      goodPositions,
      poorPositions,
      noCprDetected: finalNoCprCount,
      averageResponseTime: 0, // Simplified for now
      lastSessionTime
    }
  }

  // Check backend connection on component mount
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        await apiService.healthCheck()
        setBackendConnected(true)
        console.log('Backend connection successful')
      } catch (error) {
        setBackendConnected(false)
        console.warn('Backend connection failed, using mock data:', error)
      }
    }

    checkBackendConnection()
  }, [])

  // Load sessions from backend when connected
  useEffect(() => {
    if (backendConnected) {
      const loadSessions = async () => {
        setSessionsLoading(true)
        try {
          const sessionsResponse = await apiService.getSessions()
          if (sessionsResponse.success && sessionsResponse.sessions.length > 0) {
            setSessionsData(sessionsResponse.sessions)
            console.log('Loaded sessions:', sessionsResponse.sessions)
          }
        } catch (error) {
          console.warn('Failed to load sessions from backend:', error)
        } finally {
          setSessionsLoading(false)
        }
      }
      
      loadSessions()
    }
  }, [backendConnected])

  // Load recent photos from Mentra glasses
  useEffect(() => {
    if (backendConnected) {
      const loadRecentPhotos = async () => {
        setPhotosLoading(true)
        try {
          const photosData = await apiService.getRecentPhotos(10) // Load more for better stats
          setRecentPhotos(photosData.photos)
          
          // Calculate real statistics from the photos
          const realStats = calculateRealStats(photosData.photos)
          setSessionStats(realStats)
        } catch (error) {
          console.warn('Failed to load recent photos:', error)
        } finally {
          setPhotosLoading(false)
        }
      }
      
      loadRecentPhotos()
      
      // Poll for new photos every 5 seconds
      const interval = setInterval(loadRecentPhotos, 5000)
      return () => clearInterval(interval)
    }
  }, [backendConnected])

  const handleStartSession = (trialType: 'practice' | 'real') => {
    navigate(`/training?trialType=${trialType}`)
  }

  return (
    <div className="min-h-screen bg-primary-50 text-primary-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">CPR Training Dashboard</h1>
            <div className="flex items-center space-x-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin text-primary-600" />}
              <div className={`w-3 h-3 rounded-full ${
                backendConnected ? 'bg-green-500' : 'bg-red-500'
              }`} title={backendConnected ? 'Backend Connected' : 'Backend Disconnected'} />
            </div>
          </div>
          <p className="text-primary-600">
            Track your progress and review performance 
            {backendConnected ? ' - Live Data' : ' - Demo Mode'}
          </p>
        </div>
        
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-20 flex-shrink-0">
            <TrialTypeSidebar 
              selectedType={selectedTrialType}
              onTypeChange={setSelectedTrialType}
              sessions={sessions}
              onStartSession={handleStartSession}
              isCollapsed={true}
            />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">



            {/* Recent Photos from Mentra Glasses */}
            {backendConnected && (
              <>
                {/* Real Training Statistics */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <TrendingUp className="w-6 h-6 text-primary-600" />
                    <h2 className="text-xl font-semibold text-primary-800">Real Training Performance</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary-700">{sessionStats.totalPhotos}</div>
                      <div className="text-sm text-primary-600">Photos Analyzed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{sessionStats.goodPositions}</div>
                      <div className="text-sm text-primary-600">Good Positions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{sessionStats.poorPositions}</div>
                      <div className="text-sm text-primary-600">Need Improvement</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{sessionStats.noCprDetected}</div>
                      <div className="text-sm text-primary-600">No CPR Detected</div>
                    </div>
                  </div>
                  {sessionStats.totalPhotos > 0 && (
                    <div className="mt-4 pt-4 border-t border-primary-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-primary-600">
                          Success Rate: {Math.round((sessionStats.goodPositions / sessionStats.totalPhotos) * 100)}%
                        </span>
                        {sessionStats.lastSessionTime && (
                          <span className="text-primary-500">
                            Last Session: {new Date(sessionStats.lastSessionTime).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Analysis */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center space-x-2">
                      <Camera className="w-5 h-5 text-primary-700" />
                      <span>Recent Analysis from Mentra Glasses</span>
                      {photosLoading && <Loader2 className="w-4 h-4 animate-spin text-primary-600" />}
                    </h2>
                    <div className="text-sm text-primary-600">
                      {recentPhotos.length} photo{recentPhotos.length !== 1 ? 's' : ''} analyzed
                    </div>
                  </div>
                
                <div className="space-y-3">
                  {recentPhotos.length === 0 ? (
                    <div className="text-center py-8 text-primary-600">
                      <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No photos analyzed yet</p>
                      <p className="text-sm">Take a photo with the Mentra glasses to see analysis here</p>
                    </div>
                  ) : (
                    recentPhotos.map((photo, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-primary-200 shadow-md"
                      >
                        <div className="flex gap-4">
                          {/* Photo Display */}
                          <div className="flex-shrink-0">
                            <img
                              src={`http://localhost:8000/photos/${photo.filename}`}
                              alt="CPR Analysis"
                              className="w-24 h-24 object-cover rounded-lg border border-primary-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                          
                          {/* Analysis Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <FileText className="w-4 h-4 text-primary-600" />
                                <span className="text-sm font-medium">
                                  {new Date(photo.timestamp).toLocaleString()}
                                </span>
                                <span className="text-xs text-primary-500">
                                  {photo.user_id}
                                </span>
                              </div>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                {photo.analysis?.source === 'mentra_glasses' ? 'Mentra' : 'Backend'}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-primary-700">Analysis:</span>
                                <span className={`text-sm px-2 py-1 rounded-full ${
                                  photo.analysis?.position === 'good' 
                                    ? 'bg-green-100 text-green-700'
                                    : photo.analysis?.position === 'no_cpr'
                                    ? 'bg-gray-100 text-gray-700'
                                    : photo.analysis?.position === 'uncertain'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {photo.analysis?.position || 'unknown'}
                                </span>
                                <span className="text-xs text-primary-500">
                                  (confidence: {Math.round((photo.analysis?.confidence || 0) * 100)}%)
                                </span>
                              </div>
                              <div className="text-sm text-primary-600">
                                <strong>Guidance:</strong> {photo.guidance?.instruction || 'No guidance available'}
                              </div>
                              {photo.guidance?.all_feedback && photo.guidance.all_feedback.length > 0 && (
                                <div className="text-xs text-primary-500">
                                  <strong>Feedback:</strong> {photo.guidance.all_feedback.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard