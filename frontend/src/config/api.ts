import axios from 'axios'

// Environment configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  TIMEOUT: 10000,
  DEVELOPMENT_MODE: import.meta.env.DEVELOPMENT_MODE === 'true'
}

// Create axios instance with default configuration
export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for logging in development
apiClient.interceptors.request.use(
  (config) => {
    if (API_CONFIG.DEVELOPMENT_MODE) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    }
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    if (API_CONFIG.DEVELOPMENT_MODE) {
      console.log(`API Response: ${response.config.url}`, response.data)
    }
    return response
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default apiClient
