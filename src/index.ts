import { AppServer, AppSession } from "@mentra/sdk"
import * as fs from 'fs'
import * as path from 'path'

// Load configuration from environment variables
const PACKAGE_NAME = process.env.PACKAGE_NAME || "org.movenanter.rsc"
const PORT = parseInt(process.env.PORT || "3000")
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY

if (!MENTRAOS_API_KEY) {
  console.error("MENTRAOS_API_KEY environment variable is required")
  process.exit(1)
}

// Type definitions
interface HandPlacementResult {
  position: 'good' | 'high' | 'low' | 'left' | 'right' | 'uncertain'
  confidence: number // 0-1
}

interface AppSettings {
  saveForQA: boolean
  metronomeBPM: 100 | 110 | 120
}

type AppState = 'welcome' | 'safety_check' | 'responsiveness_check' | 'compressions' | 'aed_guidance' | 'settings'

interface RescueSessionState {
  currentState: AppState
  emergencyConfirmed: boolean
  compressionCount: number
  sessionStartTime: number
  lastHandCheckTime: number
  settings: AppSettings
  metronomeInterval?: NodeJS.Timeout
}

// Local Photo Storage
class LocalPhotoStorage {
  private photosDir: string

  constructor() {
    this.photosDir = path.join(process.cwd(), 'hands-position')
    this.ensurePhotosDirectory()
  }

  private ensurePhotosDirectory(): void {
    if (!fs.existsSync(this.photosDir)) {
      fs.mkdirSync(this.photosDir, { recursive: true })
      console.log(`Created photos directory: ${this.photosDir}`)
    }
  }

  async savePhoto(photo: File): Promise<{ success: boolean; filePath?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `hand-position-${timestamp}.jpg`
      const filePath = path.join(this.photosDir, filename)
      
      // Convert File to Buffer
      const arrayBuffer = await photo.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Save to local file
      fs.writeFileSync(filePath, buffer)
      
      console.log(`Photo saved locally: ${filePath}`)
      return {
        success: true,
        filePath: filePath
      }
    } catch (error) {
      console.error('Failed to save photo locally:', error)
      return { success: false }
    }
  }

  // Mock hand placement analysis (no real ML for now)
  async analyzeHandPlacement(photo: File): Promise<HandPlacementResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300))

    // Random mock result for now
    const positions: Array<HandPlacementResult['position']> = [
      'good', 'high', 'low', 'left', 'right', 'uncertain'
    ]
    
    const randomPosition = positions[Math.floor(Math.random() * positions.length)]
    const confidence = Math.random() * 0.4 + 0.6 // 0.6-1.0 range

    return {
      position: randomPosition,
      confidence: Math.round(confidence * 100) / 100
    }
  }
}

/**
 * Rescue - A MentraOS application for CPR guidance on smart glasses
 * Provides step-by-step CPR coaching with metronome, hand position checking, and audio guidance
 */
class Rescue extends AppServer {
  private photoStorage: LocalPhotoStorage

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY!,
      port: PORT,
    })
    
    this.photoStorage = new LocalPhotoStorage()
  }

  /**
   * Handle new session connections
   */
  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    session.logger.info(`Rescue CPR session started: ${sessionId} for user ${userId}`)

    // Initialize session state
    const state: RescueSessionState = {
      currentState: 'welcome',
      emergencyConfirmed: false,
      compressionCount: 0,
      sessionStartTime: Date.now(),
      lastHandCheckTime: 0,
      settings: {
        saveForQA: false,
        metronomeBPM: 110
      }
    }

    // Wait for wake word using VAD
    await this.waitForWakeWord(session, state)

    // Log when the session is disconnected
    session.events.onDisconnected(() => {
      session.logger.info(`Rescue CPR session ${sessionId} disconnected.`)
    })
  }

  /**
   * Wait for wake word using VAD and start CPR guidance
   */
  private async waitForWakeWord(session: AppSession, state: RescueSessionState): Promise<void> {
    state.currentState = 'welcome'
    
    // Check device capabilities first (best practice from docs)
    if (!session.capabilities?.speaker?.isPrivate) {
      session.logger.warn('⚠️ Audio not supported on this device, will play through phone')
    }
    
    // Speak welcome message with proper error handling
    try {
      const speakResult = await session.audio.speak("Rescue CPR app ready. Say 'start rescue' to begin CPR guidance.")
      if (!speakResult.success) {
        session.logger.error('Failed to speak welcome message')
      }
    } catch (error) {
      session.logger.error('Audio error during welcome message: ' + String(error))
    }
    
    let isListeningForWakeWord = true
    let speechBuffer = ""
    
    // Listen for voice activity detection (following docs example)
    session.events.onVoiceActivity((data) => {
      const isSpeaking = data.status === true || data.status === "true"
      
      if (isSpeaking && isListeningForWakeWord) {
        console.log("User started speaking - listening for wake word")
      } else if (!isSpeaking && isListeningForWakeWord) {
        console.log("User stopped speaking")
        
        // Process complete speech buffer when user stops speaking
        if (speechBuffer.length > 0) {
          const normalizedSpeech = speechBuffer.toLowerCase().trim()
          console.log(`Processing complete speech: "${normalizedSpeech}"`)
          
          if (normalizedSpeech.includes('start') && normalizedSpeech.includes('rescue')) {
            isListeningForWakeWord = false
            this.startCPRGuidance(session, state)
          }
          
          speechBuffer = "" // Reset buffer
        }
      }
    })
    
    // Subscribe to transcription events (following docs example)
    session.events.onTranscription((data) => {
      console.log(`Transcription: ${data.text}`)
      console.log(`Final: ${data.isFinal}`)
      
      if (isListeningForWakeWord && data.isFinal) {
        // Only process final transcription results
        speechBuffer += " " + data.text
        console.log(`Final transcription added to buffer: "${data.text}"`)
        console.log(`Current buffer: "${speechBuffer.trim()}"`)
      }
    })
  }
  
  /**
   * Start CPR guidance after wake word detected
   */
  private async startCPRGuidance(session: AppSession, state: RescueSessionState): Promise<void> {
    try {
      const speakResult = await session.audio.speak("Wake word detected! Rescue app is working. Ready for CPR guidance.")
      if (!speakResult.success) {
        session.logger.error('Failed to speak wake word confirmation')
      } else {
        session.logger.info('Wake word confirmed successfully')
      }
    } catch (error) {
      session.logger.error('Audio error during wake word confirmation: ' + String(error))
    }
  }
}

// TODO: Integration Instructions for Real Backend
/*
REPLACE MOCK BACKEND WITH REAL IMPLEMENTATION:

1. Replace MockBackendClient with HTTP client:
   - POST /api/analyze-hand-placement with photo file
   - POST /api/upload-photo with photo file and blur flag
   - Handle authentication headers and error responses

2. Replace mock photo capture:
   - Use session.camera.capturePhoto() instead of File constructor
   - Handle camera permissions and errors

3. Implement face blur functionality:
   - Add face detection and blur before upload
   - Ensure privacy compliance

4. Add real audio metronome:
   - Use session.audio.playAudio() for beat sounds
   - Consider audio file assets for different BPMs

5. Performance optimizations:
   - Cache analysis results
   - Optimize photo compression
   - Add offline fallback modes
*/

// Create and start the Rescue app server
const rescueApp = new Rescue()

rescueApp.start().catch(err => {
  console.error("Failed to start Rescue app:", err)
})