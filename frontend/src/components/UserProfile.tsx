import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  ChevronDown, 
  Star,
  Settings,
  LogOut,
  User,
  Shield
} from 'lucide-react'
import { mockUser } from '@/data/mockData'

interface UserProfileProps {
  className?: string
}

const UserProfile: React.FC<UserProfileProps> = ({ className = '' }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <div className={`relative ${className}`}>
      {/* User Profile Section */}
      <div className="flex items-center space-x-3">
        {/* Avatar with CPR Badge */}
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center border-2 border-primary-200 overflow-hidden shadow-md">
            {mockUser.avatar ? (
              <img 
                src={mockUser.avatar} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-white" />
            )}
          </div>
          {/* CPR Certification Badge */}
          {mockUser.isCprCertified && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <Shield className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex flex-col">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 text-left hover:bg-white/10 rounded-lg p-1 -m-1 transition-colors"
          >
            <div>
              <div className="text-sm font-medium text-primary-900 flex items-center space-x-2">
                <span>{mockUser.name}</span>
                {mockUser.isCprCertified && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                    CPR Certified
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-primary-600">{mockUser.rating} rating</span>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-primary-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white/90 backdrop-blur-sm rounded-lg border border-primary-200 shadow-xl z-50">
          <div className="py-2">
            <Link 
              to="/profile"
              className="w-full px-4 py-2 text-left text-sm text-primary-700 hover:bg-primary-100 hover:text-primary-800 transition-colors flex items-center space-x-2"
            >
              <User className="w-4 h-4" />
              <span>Profile Settings</span>
            </Link>
            <button className="w-full px-4 py-2 text-left text-sm text-primary-700 hover:bg-primary-100 hover:text-primary-800 transition-colors flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Preferences</span>
            </button>
            <hr className="my-2 border-primary-200" />
            <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center space-x-2">
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserProfile
