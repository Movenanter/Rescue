import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ProfileSettings from '@/components/ProfileSettings'
import { mockUser } from '@/data/mockData'
import { User } from '@/types/session'

const ProfileSettingsPage: React.FC = () => {
  const [user, setUser] = useState<User>(mockUser)

  const handleSave = async (updatedUser: Partial<User>) => {
    // In a real app, this would make an API call
    console.log('Saving updated user data:', updatedUser)
    
    // Update local state for now
    setUser(prev => ({
      ...prev,
      ...updatedUser,
      updatedAt: new Date()
    }))
  }

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-primary-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <Link 
                to="/"
                className="flex items-center space-x-2 text-primary-600 hover:text-primary-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[calc(100vh-80px)]">
        <ProfileSettings 
          user={user} 
          onSave={handleSave}
        />
      </div>
    </div>
  )
}

export default ProfileSettingsPage
