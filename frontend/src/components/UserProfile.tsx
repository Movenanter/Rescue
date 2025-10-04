import React, { useState } from 'react'
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
          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center border-2 border-gray-700">
            <User className="w-6 h-6 text-gray-300" />
          </div>
          {/* CPR Certification Badge */}
          {mockUser.isCprCertified && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-950 shadow-lg">
              <Shield className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex flex-col">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 text-left hover:bg-gray-800 rounded-lg p-1 -m-1 transition-colors"
          >
            <div>
              <div className="text-sm font-medium text-white flex items-center space-x-2">
                <span>{mockUser.name}</span>
                {mockUser.isCprCertified && (
                  <span className="text-xs bg-green-950 text-green-400 px-2 py-0.5 rounded-full border border-green-800">
                    CPR Certified
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-gray-400">{mockUser.rating} rating</span>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 rounded-lg border border-gray-700 shadow-lg z-50">
          <div className="py-2">
            <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Profile Settings</span>
            </button>
            <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Preferences</span>
            </button>
            <hr className="my-2 border-gray-700" />
            <button className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors flex items-center space-x-2">
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
