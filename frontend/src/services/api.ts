import apiClient from '../config/api'
import { AfterActionReport, CPRSession, User, Correction } from '../types/session'

// API Response interfaces
interface ApiResponse<T> {
  Success: boolean
  data?: T
  error?: string
  message?: string
}

interface HealthCheckResponse {
  service: string
  version: string
  status: string
  tflite_model: string
  mediapipe: string
  active_sessions: number
}

interface AnalyzHandResponse {
  success: boolean
  analysis: {
    position: string
    confidence: number
  }
  guidance: string
  detailed_feedback: string[]
  metrics: {
    arm_angle: number
    depth_inches: number
    quality_percent: number
    hands_centered: boolean
    compression_phase: string
  }
  timestamp: string
}

interface UploadPhotoResponse {
  success: boolean
  message: string
  analysis: {
    instruction: string
    all_feedback: string[]
    priority: string
    metrics: {
      arm_angle: number
      depth_inches: number
      quality_percent: number
      hands_centered: boolean
      compression_phase: string
    }
  }
  file_path: string
}

// API Services
export const apiService = {
  // Health check
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await apiClient.get<HealthCheckResponse>('/')
    return response.data
  },

  // Analyze CPR hands positioning
  async analyzeHands(imageFile: File, sessionId?: string): Promise<AnalyzHandResponse> {
    const formData = new FormData()
    formData.append('file', imageFile)
    if (sessionId) formData.append('session_id', sessionId)
    
    const response = await apiClient.post<AnalyzHandResponse>('/analyze-pose', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Upload photo with analysis
  async uploadPhoto(
    imageFile: File,
    userId?: string,
    sessionId?: string,
    timestamp?: string
  ): Promise<UploadPhotoResponse> {
    const formData = new FormData()
    formData.append('file', imageFile)
    if (userId) formData.append('user_id', userId)
    if (sessionId) formData.append('session_id', sessionId)
    if (timestamp) formData.append('timestamp', timestamp)
    
    const response = await apiClient.post<UploadPhotoResponse>('/upload-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Generate AI Summary from session data
  async generateSummary(sessionId: string, analysisData: any): Promise<string> {
    const response = await apiClient.post('/generate-summary', {
      sessionId,
      analysisData
    })
    return response.data.summary
  },

  // Session management endpoints
  async getSessions() {
    const response = await apiClient.get('/sessions')
    return response.data
  },

  async getSession(sessionId: string) {
    const response = await apiClient.get(`/session/${sessionId}`)
    return response.data
  },

  async createSession(deviceId: string = 'web-app') {
    const response = await apiClient.post('/start-session', null, {
      params: { device_id: deviceId }
    })
    return response.data
  },

  async endSession(sessionId: string): Promise<AfterActionReport> {
    // TODO: Implement when backend session management is ready
    throw new Error('End session endpoint not implemented yet')
  },

  async getUserProfile(userId: string): Promise<User> {
    // TODO: Implement when backend user management is ready
    throw new Error('User profile endpoint not implemented yet')
  },

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    // TODO: Implement when backend user management is ready
    throw new Error('Update user profile endpoint not implemented yet')
  }
}

export default apiService
