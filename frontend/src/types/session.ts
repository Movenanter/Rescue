export interface Correction {
  id: string
  timestamp: Date
  type: 'hand_position' | 'compression_depth' | 'compression_rate' | 'breath_technique' | 'timing'
  description: string
  duration?: number
  compressionCount?: number
  severity: 'minor' | 'moderate' | 'critical'
}

export interface SessionStep {
  id: string
  timestamp: Date
  action: string
  description: string
  corrections?: Correction[]
  performance?: {
    compressionRate?: number
    compressionDepth?: number
    handPosition?: 'correct' | 'off-center'
    breathsDelivered?: number
  }
}

export interface CPRSession {
  id: string
  userId: string
  startTime: Date
  endTime?: Date
  steps: SessionStep[]
  totalCompressions: number
  totalBreaths: number
  avgCompressionRate: number
  avgCompressionDepth: number
  overallScore: number
  status: 'in_progress' | 'completed' | 'aborted'
  trialType: 'practice' | 'real'
  certification?: {
    passed: boolean
    score: number
    certificateId?: string
  }
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  emergencyContact?: {
    name: string
    email: string
    phone: string
    relationship: string
  }
  organization?: string
  role?: string
  avatar?: string
  rating: number
  isCprCertified: boolean
  certificationExpiry?: Date
  trainingHistory?: {
    totalSessions: number
    lastSession?: Date
    averageScore: number
  }
  preferences?: {
    emailNotifications: boolean
    smsNotifications: boolean
    language: 'en' | 'es' | 'fr'
    theme: 'light' | 'dark' | 'auto'
    metronomeEnabled: boolean
    voiceCoaching: boolean
  }
  createdAt: Date
  updatedAt: Date
}

export interface AfterActionReport {
  session: CPRSession
  summary: {
    totalDuration: number
    totalCorrections: number
    criticalErrors: number
    performanceScore: number
    strengths: string[]
    areasForImprovement: string[]
  }
  timeline: SessionStep[]
  recommendations: string[]
  generatedAt: Date
}