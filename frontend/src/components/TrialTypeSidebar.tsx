import React from 'react'
import { 
  Activity, 
  Clock, 
  Trophy, 
  BookOpen,
  Users
} from 'lucide-react'

interface SessionData {
  id: string
  date: Date
  duration: string
  score: number
  status: 'completed' | 'in_progress' | 'aborted'
  passed: boolean
  trialType: 'practice' | 'real'
}

interface TrialTypeSidebarProps {
  selectedType: 'practice' | 'real' | 'all'
  onTypeChange: ( type: 'practice' | 'real' | 'all') => void
  sessions: SessionData[]
  onStartSession?: (trialType: 'practice' | 'real') => void
  isCollapsed?: boolean
}

const TrialTypeSidebar: React.FC<TrialTypeSidebarProps> = ({ 
  selectedType, 
  onTypeChange, 
  sessions,
  onStartSession,
  isCollapsed = false
}) => {
  const practiceSessions = sessions.filter(s => s.trialType === 'practice')
  const realSessions = sessions.filter(s => s.trialType === 'real')
  
  const practiceStats = {
    total: practiceSessions.length,
    avgScore: practiceSessions.length > 0 
      ? Math.round(practiceSessions.reduce((sum, s) => sum + s.score, 0) / practiceSessions.length)
      : 0,
    passed: practiceSessions.filter(s => s.passed).length
  }
  
  const realStats = {
    total: realSessions.length,
    avgScore: realSessions.length > 0 
      ? Math.round(realSessions.reduce((sum, s) => sum + s.score, 0) / realSessions.length)
      : 0,
    passed: realSessions.filter(s => s.passed).length
  }

  // Collapsed view with icons and one word descriptions
  if (isCollapsed) {
    return (
      <div className="w-20 bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-primary-200 flex flex-col items-center shadow-lg">
        {/* Activity icon as header */}
        <div className="mb-6 flex flex-col items-center">
          <Activity className="w-5 h-5 text-primary-700 mb-1" />
          <span className="text-xs font-medium text-primary-700">Types</span>
        </div>
        
        {/* Trial Type Icons */}
        <div className="space-y-4 mb-6">
          <button
            onClick={() => onTypeChange('all')}
            className={`w-full py-2 px-2 rounded-lg transition-all flex flex-col items-center ${
              selectedType === 'all'
                ? 'bg-primary-200 text-primary-800 shadow-sm'
                : 'bg-white/50 text-primary-600 hover:bg-white/70 hover:text-primary-800'
            }`}
          >
            <Users className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">All</span>
          </button>

          <button
            onClick={() => onTypeChange('practice')}
            className={`w-full py-2 px-2 rounded-lg transition-all flex flex-col items-center ${
              selectedType === 'practice'
                ? 'bg-blue-200 text-blue-800 shadow-sm'
                : 'bg-white/50 text-primary-600 hover:bg-white/70 hover:text-blue-600'
            }`}
          >
            <BookOpen className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Practice</span>
          </button>

          <button
            onClick={() => onTypeChange('real')}
            className={`w-full py-2 px-2 rounded-lg transition-all flex flex-col items-center ${
              selectedType === 'real'
                ? 'bg-red-200 text-red-800 shadow-sm'
                : 'bg-white/50 text-primary-600 hover:bg-white/70 hover:text-red-600'
            }`}
          >
            <Trophy className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Real</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mt-auto space-y-3">
          <button 
            onClick={() => onStartSession?.('practice')}
            className="w-full py-2 px-2 bg-blue-100 border border-blue-300 rounded-lg text-blue-600 hover:bg-blue-200 transition-colors shadow-sm flex flex-col items-center"
          >
            <BookOpen className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Start Practice</span>
          </button>
          
          <button 
            onClick={() => onStartSession?.('real')}
            className="w-full py-2 px-2 bg-red-100 border border-red-300 rounded-lg text-red-600 hover:bg-red-200 transition-colors shadow-sm flex flex-col items-center"
          >
            <Trophy className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Start Real</span>
          </button>
        </div>
      </div>
    )
  }

  // Expanded view (original)
  return (
    <div className="w-80 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-primary-200 shadow-lg">
      <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
        <Activity className="w-5 h-5 text-primary-700" />
        <span>Trial Types</span>
      </h2>

      {/* Trial Type Buttons */}
      <div className="space-y-3 mb-8">
        <button
          onClick={() => onTypeChange('all')}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-all ${
            selectedType === 'all'
              ? 'bg-primary-200 border-primary-300 text-primary-800 shadow-sm'
              : 'bg-white/50 border-primary-200 text-primary-700 hover:bg-white/70 hover:border-primary-300'
          }`}
        >
          <Users className="w-5 h-5" />
          <div className="text-left">
            <div className="font-medium">All Trials</div>
            <div className="text-xs text-primary-600">{sessions.length} sessions</div>
          </div>
        </button>

        <button
          onClick={() => onTypeChange('practice')}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-all ${
            selectedType === 'practice'
              ? 'bg-blue-200 border-blue-300 text-blue-800 shadow-sm'
              : 'bg-white/50 border-primary-200 text-primary-700 hover:bg-white/70 hover:border-blue-300'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <div className="text-left">
            <div className="font-medium">Practice Trials</div>
            <div className="text-xs text-primary-600">{practiceStats.total} sessions</div>
          </div>
        </button>

        <button
          onClick={() => onTypeChange('real')}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-all ${
          selectedType === 'real'
            ? 'bg-red-200 border-red-300 text-red-800 shadow-sm'
            : 'bg-white/50 border-primary-200 text-primary-700 hover:bg-white/70 hover:border-red-300'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <div className="text-left">
            <div className="font-medium">Real Trials</div>
            <div className="text-xs text-primary-600">{realStats.total} sessions</div>
          </div>
        </button>
      </div>

      {/* Statistics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-700">Statistics</h3>
        
        {selectedType === 'practice' && (
          <div className="space-y-3">
            <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Practice Sessions</span>
                <span className="text-sm text-primary-600">{practiceStats.total}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-primary-600">Avg Score</div>
                  <div className="font-semibold text-blue-700">{practiceStats.avgScore}%</div>
                </div>
                <div>
                  <div className="text-primary-600">Passed</div>
                  <div className="font-semibold text-blue-700">{practiceStats.passed}/{practiceStats.total}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedType === 'real' && (
          <div className="space-y-3">
            <div className="bg-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700">Real Trials</span>
                <span className="text-sm text-primary-600">{realStats.total}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-primary-600">Avg Score</div>
                  <div className="font-semibold text-red-700">{realStats.avgScore}%</div>
                </div>
                <div>
                  <div className="text-primary-600">Passed</div>
                  <div className="font-semibold text-red-700">{realStats.passed}/{realStats.total}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedType === 'all' && (
          <div className="space-y-3">
            <div className="bg-white/50 border border-primary-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-primary-600 mb-1">Practice</div>
                  <div className="font-semibold text-blue-600">{practiceStats.total}</div>
                  <div className="text-primary-500">Avg: {practiceStats.avgScore}%</div>
                </div>
                <div>
                  <div className="text-primary-600 mb-1">Real Trials</div>
                  <div className="font-semibold text-red-600">{realStats.total}</div>
                  <div className="text-primary-500">Avg: {realStats.avgScore}%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 space-y-3">
        <h3 className="text-lg font-semibold text-primary-700 mb-3">Quick Actions</h3>
        
        <div className="space-y-2">
          <button 
            onClick={() => onStartSession?.('practice')}
            className="w-full flex items-center space-x-2 p-2 bg-blue-100 border border-blue-300 rounded-lg text-blue-600 hover:bg-blue-200 transition-colors shadow-sm">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">Start Practice Session</span>
          </button>
          
          <button 
            onClick={() => onStartSession?.('real')}
            className="w-full flex items-center space-x-2 p-2 bg-red-100 border border-red-300 rounded-lg text-red-600 hover:bg-red-200 transition-colors shadow-sm">
            <Trophy className="w-4 h-4" />
            <span className="text-sm">Start Real Trial</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrialTypeSidebar