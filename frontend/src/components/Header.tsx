import React from 'react'
import UserProfile from './UserProfile'

interface HeaderProps {
  className?: string
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  return (
    <header className={`bg-white/80 backdrop-blur-sm border-b border-primary-200 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <h1 className="text-xl font-bold text-primary-900">Rescue</h1>
          </div>

          {/* User Profile */}
          <UserProfile />
        </div>
      </div>
    </header>
  )
}

export default Header
