import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Activity, 
  Award, 
  Clock, 
  FileText,
  TrendingUp,
  Calendar,
  ChevronRight
} from 'lucide-react'
import Header from './Header'
import TrialTypeSidebar from './TrialTypeSidebar'
import { mockSessions } from '../data/mockData'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [selectedTrialType, setSelectedTrialType] = useState<'practice' | 'real' | 'all'>('all')
  
  const filteredSessions = useMemo(() => {
    if (selectedTrialType === 'all') return mockSessions
    return mockSessions.filter(session => session.trialType === selectedTrialType)
  }, [selectedTrialType])

  const handleStartSession = (trialType: 'practice' | 'real') => {
    navigate(`/training?trialType=${trialType}`)
  }

  return (
    <div className="min-h-screen bg-primary-50 text-primary-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">CPR Training Dashboard</h1>
          <p className="text-primary-600">Track your progress and review performance</p>
        </div>
        
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-20 flex-shrink-0">
            <TrialTypeSidebar 
              selectedType={selectedTrialType}
              onTypeChange={setSelectedTrialType}
              sessions={mockSessions}
              onStartSession={handleStartSession}
              isCollapsed={true}
            />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="w-6 h-6 text-primary-700" />
                  <span className="text-2xl font-bold">{filteredSessions.length}</span>
                </div>
                <p className="text-sm text-primary-600">
                  {selectedTrialType === 'all' ? 'Total Sessions' : 
                   selectedTrialType === 'practice' ? 'Practice Sessions' : 'Real Trials'}
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <Award className="w-6 h-6 text-primary-700" />
                  <span className="text-2xl font-bold">
                    {filteredSessions.length > 0 
                      ? Math.round(filteredSessions.reduce((sum, s) => sum + s.score, 0) / filteredSessions.length)
                      : 0}%
                  </span>
                </div>
                <p className="text-sm text-primary-600">Average Score</p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <Clock className="w-6 h-6 text-primary-700" />
                  <span className="text-2xl font-bold">
                    {filteredSessions.length > 0 
                      ? Math.round(filteredSessions.reduce((sum, s) => {
                          const [mins, secs] = s.duration.split(':').map(Number)
                          return sum + mins * 60 + secs
                        }, 0) / 3600 * 10) / 10
                      : 0}h
                  </span>
                </div>
                <p className="text-sm text-primary-600">Total Training Time</p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-6 h-6 text-primary-700" />
                  <span className="text-2xl font-bold">
                    {filteredSessions.filter(s => s.passed).length}/{filteredSessions.length}
                  </span>
                </div>
                <p className="text-sm text-primary-600">Pass Rate</p>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-primary-700" />
                  <span>
                    {selectedTrialType === 'all' ? 'Recent Sessions' :
                     selectedTrialType === 'practice' ? 'Practice Sessions' : 'Real Trials'}
                  </span>
                </h2>
                <button
                  onClick={() => navigate('/training')}
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  Start New Session
                </button>
              </div>
              
              <div className="space-y-3">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-primary-600">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No {selectedTrialType === 'all' ? 'sessions' : 
                             selectedTrialType === 'practice' ? 'practice sessions' : 'real trials'} found</p>
                  </div>
                ) : (
                  filteredSessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      onClick={() => navigate(`/report/session-001`)}
                      className="p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-primary-200 shadow-md hover:border-primary-300 hover:shadow-lg cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <FileText className="w-4 h-4 text-primary-600" />
                            <span className="text-sm font-medium">
                              {session.date.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              session.trialType === 'practice' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {session.trialType === 'practice' ? 'Practice' : 'Real Trial'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-xs">
                            <span className="text-primary-600">Duration: {session.duration}</span>
                            <span className={`font-medium ${session.score >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                              Score: {session.score}%
                            </span>
                            {session.passed && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                Passed
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-primary-500" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-8 bg-white/60 backdrop-blur-sm border border-primary-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Ready for your next training session?</h3>
                  <p className="text-primary-600">
                    {selectedTrialType === 'all' 
                      ? 'Practice makes perfect. Continue improving your CPR skills.'
                      : selectedTrialType === 'practice'
                      ? 'Practice sessions help you improve without pressure.'
                      : 'Real trials test your skills under certification conditions.'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/training')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors shadow-lg ${
                    selectedTrialType === 'practice' 
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : selectedTrialType === 'real'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  Start {selectedTrialType === 'practice' ? 'Practice' : 
                         selectedTrialType === 'real' ? 'Real Trial' : 'Training'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard