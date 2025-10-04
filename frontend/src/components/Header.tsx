import React from 'react'
import UserProfile from './UserProfile'

interface HeaderProps {
  className?: string
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  return (
    <header className={`bg-gray-950 border-b border-gray-800 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-lime-400 to-lime-600 rounded-lg flex items-center justify-center">
              <span className="text-gray-900 font-bold text-lg">R</span>
            </div>
            <h1 className="text-xl font-bold text-white">Rescue</h1>
          </div>

          {/* User Profile */}
          <UserProfile />
        </div>
      </div>
    </header>
  )
}

export default Header
