import React from 'react'
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  const recentSessions = [
    {
      id: 'session-001',
      date: new Date('2025-10-03T14:30:00'),
      duration: '15:30',
      score: 82,
      status: 'completed',
      passed: true
    },
    {
      id: 'session-002',
      date: new Date('2025-10-02T10:15:00'),
      duration: '18:45',
      score: 75,
      status: 'completed',
      passed: true
    },
    {
      id: 'session-003',
      date: new Date('2025-10-01T09:00:00'),
      duration: '12:20',
      score: 68,
      status: 'completed',
      passed: false
    }
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">CPR Training Dashboard</h1>
          <p className="text-gray-400">Track your progress and review performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-6 h-6 text-lime-400" />
              <span className="text-2xl font-bold">24</span>
            </div>
            <p className="text-sm text-gray-400">Total Sessions</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold">78%</span>
            </div>
            <p className="text-sm text-gray-400">Average Score</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-6 h-6 text-blue-400" />
              <span className="text-2xl font-bold">6.5h</span>
            </div>
            <p className="text-sm text-gray-400">Total Training Time</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <span className="text-2xl font-bold">+12%</span>
            </div>
            <p className="text-sm text-gray-400">Improvement Rate</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-lime-400" />
                <span>Recent Sessions</span>
              </h2>
              <button
                onClick={() => navigate('/training')}
                className="text-sm text-lime-400 hover:text-lime-300"
              >
                Start New Session
              </button>
            </div>
            
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => navigate(`/report/${session.id}`)}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-lime-400/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {session.date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-gray-400">Duration: {session.duration}</span>
                        <span className={`font-medium ${session.score >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                          Score: {session.score}%
                        </span>
                        {session.passed && (
                          <span className="px-2 py-1 bg-green-950/50 text-green-400 rounded-full">
                            Passed
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-lime-400" />
              <span>Performance Trend</span>
            </h2>
            
            <div className="h-64 flex items-end justify-between space-x-2">
              {[65, 68, 70, 72, 75, 78, 82].map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-lime-400 rounded-t"
                    style={{ height: `${(value / 100) * 200}px` }}
                  />
                  <span className="text-xs text-gray-500 mt-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-lime-950/20 to-green-950/20 border border-lime-900 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">Ready for your next training session?</h3>
              <p className="text-gray-400">Practice makes perfect. Continue improving your CPR skills.</p>
            </div>
            <button
              onClick={() => navigate('/training')}
              className="px-6 py-3 bg-lime-400 text-gray-900 rounded-lg font-medium hover:bg-lime-300 transition-colors"
            >
              Start Training
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard