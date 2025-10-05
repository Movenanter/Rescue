import React, { useState } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Shield, 
  Bell, 
  Volume2,
  Mic,
  Save,
  Camera,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { User as UserType } from '@/types/session'

interface ProfileSettingsProps {
  user: UserType
  onSave: (updatedUser: Partial<UserType>) => void
  className?: string
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ 
  user, 
  onSave, 
  className = '' 
}) => {
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email!,
    phone: user.phone || '',
    organization: user.organization || '',
    role: user.role || '',
    emergencyContact: {
      name: user.emergencyContact?.name || '',
      email: user.emergencyContact?.email || '',
      phone: user.emergencyContact?.phone || '',
      relationship: user.emergencyContact?.relationship || ''
    }
  })

  const [preferences, setPreferences] = useState({
    emailNotifications: user.preferences?.emailNotifications ?? true,
    smsNotifications: user.preferences?.smsNotifications ?? false,
    language: user.preferences?.language ?? 'en',
    theme: user.preferences?.theme ?? 'dark',
    metronomeEnabled: user.preferences?.metronomeEnabled ?? true,
    voiceCoaching: user.preferences?.voiceCoaching ?? true
  })

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile')
  const [isDirty, setIsDirty] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user.avatar || null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
    setIsDirty(true)
  }

  const handleEmergencyContactChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value
      }
    }))
    setIsDirty(true)
  }

  const handlePreferencesChange = (field: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }))
    setIsDirty(true)
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    if (!validTypes.includes(file.type)) {
      alert('Please upload a JPG, PNG, or GIF file.')
      return
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      alert('File size must be less than 2MB.')
      return
    }

    // Create preview URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPhotoPreview(result)
      setProfilePhoto(result) // Store the data URL
      setIsDirty(true)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setProfilePhoto(null)
    setPhotoPreview(null)
    setIsDirty(true)
  }

  const handleSave = async () => {
    try {
      await onSave({
        ...profileData,
        avatar: profilePhoto,
        preferences: preferences,
        updatedAt: new Date()
      })
      setPhotoPreview(null) // Clear preview after save
      setIsDirty(false)
      setShowSaveSuccess(true)
      setTimeout(() => setShowSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  const formatCertificationExpiry = (date?: Date) => {
    if (!date) return 'Not certified'
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getCertificationStatus = () => {
    if (!user.isCprCertified || !user.certificationExpiry) {
      return { status: 'not-certified', color: 'text-red-400' }
    }
    
    const now = new Date()
    const diffInDays = Math.ceil((user.certificationExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays < 0) {
      return { status: 'expired', color: 'text-red-400' }
    } else if (diffInDays < 30) {
      return { status: 'expires-soon', color: 'text-yellow-400' }
    } else {
      return { status: 'valid', color: 'text-green-400' }
    }
  }

  const certStatus = getCertificationStatus()

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Profile Settings</h1>
        <p className="text-primary-600">Manage your account information and preferences</p>
      </div>

      {/* Success banner */}
      {showSaveSuccess && (
        <div className="mb-6 bg-green-100 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-700">Profile updated successfully!</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-primary-200 mb-8">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-primary-600 hover:text-primary-800 hover:border-primary-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Profile</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preferences'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-primary-600 hover:text-primary-800 hover:border-primary-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Preferences</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-primary-600 hover:text-primary-800 hover:border-primary-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Security & Certification</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-8">
          {/* Avatar Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border border-primary-200 shadow-lg">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Profile Photo</h2>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center border-2 border-primary-200 overflow-hidden shadow-md">
                  {profilePhoto ? (
                    <img 
                      src={photoPreview || profilePhoto} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-white" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="absolute bottom-0 right-0 w-9 h-9 opacity-0 cursor-pointer"
                />
                <button className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors border-2 border-white pointer-events-none shadow-lg">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    Choose Photo
                  </label>
                  {profilePhoto && (
                    <button
                      onClick={handleRemovePhoto}
                      className="text-red-600 hover:text-red-700 font-medium cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-primary-500 text-sm">JPG, PNG or GIF. Max size 2MB.</p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border border-primary-200 shadow-lg">
            <h2 className="text-xl font-semibold text-primary-900 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-500" />
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-500" />
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-500" />
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Organization</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-500" />
                  <input
                    type="text"
                    value={profileData.organization}
                    onChange={(e) => handleProfileChange('organization', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Metro Emergency Services"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Role/Position</label>
                <div className="relative">
                  <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-500" />
                  <input
                    type="text"
                    value={profileData.role}
                    onChange={(e) => handleProfileChange('role', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Paramedic"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border border-primary-200 shadow-lg">
            <h2 className="text-xl font-semibold text-primary-900 mb-6">Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Contact Name</label>
                <input
                  type="text"
                  value={profileData.emergencyContact.name}
                  onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Relationship</label>
                <input
                  type="text"
                  value={profileData.emergencyContact.relationship}
                  onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={profileData.emergencyContact.email}
                  onChange={(e) => handleEmergencyContactChange('email', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Contact Phone</label>
                <input
                  type="tel"
                  value={profileData.emergencyContact.phone}
                  onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-8">
          {/* Notification Preferences */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border border-primary-200 shadow-lg">
            <h2 className="text-xl font-semibold text-primary-900 mb-6">Notification Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-primary-900 font-medium">Email Notifications</h3>
                  <p className="text-primary-600 text-sm">Receive training reminders and session reports via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={(e) => handlePreferencesChange('emailNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-primary-900 font-medium">SMS Notifications</h3>
                  <p className="text-primary-600 text-sm">Receive urgent notifications via text message</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.smsNotifications}
                    onChange={(e) => handlePreferencesChange('smsNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* App Preferences */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border border-primary-200 shadow-lg">
            <h2 className="text-xl font-semibold text-primary-900 mb-6">App Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Language</label>
                <select
                  value={preferences.language}
                  onChange={(e) => handlePreferencesChange('language', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-primary-200 rounded-lg text-primary-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Theme</label>
                <select
                  value={preferences.theme}
                  onChange={(e) => handlePreferencesChange('theme', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-primary-200 rounded-lg text-primary-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="true">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Training Preferences */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border border-primary-200 shadow-lg">
            <h2 className="text-xl font-semibold text-primary-900 mb-6">Training Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-5 h-5 text-primary-500" />
                  <div>
                    <h3 className="text-primary-900 font-medium">Metronome</h3>
                    <p className="text-primary-600 text-sm">Enable rhythm guidance during training</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.metronomeEnabled}
                    onChange={(e) => handlePreferencesChange('metronomeEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mic className="w-5 h-5 text-primary-500" />
                  <div>
                    <h3 className="text-primary-900 font-medium">Voice Coaching</h3>
                    <p className="text-primary-600 text-sm">Enable audio feedback during training</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.voiceCoaching}
                    onChange={(e) => handlePreferencesChange('voiceCoaching', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-8">
          {/* CPR Certification */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border border-primary-200 shadow-lg">
            <h2 className="text-xl font-semibold text-primary-900 mb-6">CPR Certification</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Shield className={`w-6 h-6 ${certStatus.color}`} />
                <div>
                  <h3 className="text-primary-900 font-medium">Certification Status</h3>
                  <p className={`text-sm ${certStatus.color}`}>
                    {user.isCprCertified 
                      ? (certStatus.status === 'valid' ? 'Valid' : 
                         certStatus.status === 'expires-soon' ? 'Expires Soon' : 
                         'Expired')
                      : 'Not Certified'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-primary-500" />
                <div>
                  <h3 className="text-primary-900 font-medium">Expiry Date</h3>
                  <p className="text-primary-600 text-sm">{formatCertificationExpiry(user.certificationExpiry)}</p>
                </div>
              </div>
              
              {certStatus.status === 'expires-soon' && (
                <div className="bg-yellow-950 border border-yellow-700 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-yellow-400 font-medium">Renewal Required</h4>
                    <p className="text-yellow-300 text-sm">Your CPR certification will expire soon. Please renew your certification to maintain your status.</p>
                  </div>
                </div>
              )}
              
              {certStatus.status === 'expired' && (
                <div className="bg-red-950 border border-red-700 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-red-400 font-medium">Certification Expired</h4>
                    <p className="text-red-300 text-sm">Your CPR certification has expired. Please complete a renewal course to continue accessing training features.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Training History */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border border-primary-200 shadow-lg">
            <h2 className="text-xl font-semibold text-primary-900 mb-6">Training History</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-primary-900 font-medium">Total Sessions</h3>
                <p className="text-2xl font-bold text-blue-600">{user.trainingHistory?.totalSessions || 0}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-primary-900 font-medium">Average Score</h3>
                <p className="text-2xl font-bold text-green-600">{user.trainingHistory?.averageScore || 0}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-primary-900 font-medium">Last Session</h3>
                <p className="text-sm text-primary-600">
                  {user.trainingHistory?.lastSession 
                    ? user.trainingHistory.lastSession.toLocaleDateString()
                    : 'No sessions yet'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Account Information</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Member Since</h3>
                  <p className="text-gray-400 text-sm">{user.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Last Updated</h3>
                  <p className="text-gray-400 text-sm">{user.updatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Account Rating</h3>
                  <p className="text-gray-400 text-sm">{user.rating}/5.0 stars</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 shadow-lg ${
            isDirty
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-primary-300 text-primary-400 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  )
}

export default ProfileSettings
