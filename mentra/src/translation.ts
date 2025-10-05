// translation.ts - Real-time translation module for Mentra glasses
import { AppSession } from "@mentra/sdk";

// ---------- Configuration ----------
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY || "";
const ELEVEN_LABS_VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel voice
const ELEVEN_LABS_MODEL = "eleven_multilingual_v2";

// Supported languages for translation
export const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'ru': 'Russian'
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

// ---------- Translation State ----------
export interface TranslationState {
  isActive: boolean;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  isListening: boolean;
  translationHistory: TranslationEntry[];
}

export interface TranslationEntry {
  timestamp: Date;
  original: string;
  translated: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

// ---------- Google Translate API (free tier) ----------
async function translateText(
  text: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode
): Promise<string> {
  try {
    // Using Google Translate free API (limited but works for demo)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Extract translated text from response
    const translated = data[0].map((item: any) => item[0]).join('');
    return translated;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original if translation fails
  }
}

// ---------- Eleven Labs Text-to-Speech ----------
async function synthesizeSpeech(
  text: string,
  language: LanguageCode
): Promise<ArrayBuffer | null> {
  if (!ELEVEN_LABS_API_KEY) {
    console.warn("Eleven Labs API key not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_LABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_LABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: ELEVEN_LABS_MODEL,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          },
          // Language code hints for better pronunciation
          language_code: language
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Eleven Labs API error: ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Speech synthesis error:', error);
    return null;
  }
}

// ---------- Translation Manager Class ----------
export class TranslationManager {
  private state: TranslationState;
  private recognitionTimer?: NodeJS.Timeout;
  private speechBuffer: string = "";
  private currentSession?: AppSession;

  constructor() {
    this.state = {
      isActive: false,
      sourceLanguage: 'en',
      targetLanguage: 'es',
      isListening: false,
      translationHistory: []
    };
  }

  // Start translation mode
  async start(session: AppSession, targetLang: LanguageCode = 'es'): Promise<void> {
    this.currentSession = session;
    this.state.isActive = true;
    this.state.sourceLanguage = 'en';  // Always from English for now
    this.state.targetLanguage = targetLang;
    this.state.isListening = true;

    // Start continuous listening
    this.startListening();
  }

  // Stop translation mode
  async stop(): Promise<void> {
    this.state.isActive = false;
    this.state.isListening = false;
    
    if (this.recognitionTimer) {
      clearTimeout(this.recognitionTimer);
      this.recognitionTimer = undefined;
    }
  }

  // Toggle between languages
  async swapLanguages(): Promise<void> {
    const temp = this.state.sourceLanguage;
    this.state.sourceLanguage = this.state.targetLanguage;
    this.state.targetLanguage = temp;
  }

  // Change target language
  async setTargetLanguage(lang: LanguageCode): Promise<void> {
    this.state.targetLanguage = lang;
  }

  // Check if translation is active
  isActive(): boolean {
    return this.state.isActive;
  }

  // Get current language settings
  getLanguages(): { sourceLanguage: LanguageCode; targetLanguage: LanguageCode } {
    return {
      sourceLanguage: this.state.sourceLanguage,
      targetLanguage: this.state.targetLanguage
    };
  }

  // Process incoming speech
  private async processSpeech(text: string) {
    if (!text || text.length < 3) return; // Ignore very short utterances

    try {
      // Translate the text
      const translated = await translateText(
        text,
        this.state.sourceLanguage,
        this.state.targetLanguage
      );

      // Store in history
      const entry: TranslationEntry = {
        timestamp: new Date(),
        original: text,
        translated: translated,
        sourceLanguage: this.state.sourceLanguage,
        targetLanguage: this.state.targetLanguage
      };
      this.state.translationHistory.push(entry);

      // Limit history size
      if (this.state.translationHistory.length > 100) {
        this.state.translationHistory.shift();
      }

      // Synthesize and play the translation
      await this.speakTranslation(translated);

      // Log for debugging
      if (this.currentSession) {
        this.currentSession.logger.info(`Translation: "${text}" → "${translated}"`);
      }

    } catch (error) {
      if (this.currentSession) {
        this.currentSession.logger.error(`Translation error: ${error}`);
      }
    }
  }

  // Speak the translated text
  private async speakTranslation(text: string) {
    if (!this.currentSession) return;
    
    // Try Eleven Labs first for natural voice if API key is available
    if (ELEVEN_LABS_API_KEY) {
      const audioBuffer = await synthesizeSpeech(text, this.state.targetLanguage);
      
      if (audioBuffer && this.currentSession.audio) {
        try {
          // Convert ArrayBuffer to base64 for playback
          const base64Audio = Buffer.from(audioBuffer).toString('base64');
          
          // Create a data URL for the audio
          const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
          
          // Play using session audio (if it supports URL playback)
          // Note: This may need adjustment based on Mentra SDK capabilities
          await this.currentSession.audio.speak(text, {
            voice_settings: { speed: 1.0 }
          });
          return;
        } catch (error) {
          console.error('Failed to play Eleven Labs audio:', error);
        }
      }
    }
    
    // Fallback to built-in TTS
    await this.currentSession.audio.speak(text, { 
      voice_settings: { speed: 1.0 }
    });
  }

  // Get appropriate voice for language (fallback)
  private getVoiceForLanguage(lang: LanguageCode): any {
    // This would map to Mentra's built-in voices if available
    const voiceMap: Record<LanguageCode, string> = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-PT',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'ar': 'ar-SA',
      'hi': 'hi-IN',
      'ru': 'ru-RU'
    };
    return { language: voiceMap[lang] || 'en-US' };
  }

  // Start continuous listening
  private startListening() {
    // Set up continuous speech recognition with sentence detection
    this.recognitionTimer = setInterval(() => {
      if (this.speechBuffer.length > 0) {
        this.processSpeech(this.speechBuffer);
        this.speechBuffer = "";
      }
    }, 2000); // Process every 2 seconds of silence
  }

  // Handle incoming transcription
  async handleTranscription(text: string, isFinal: boolean) {
    if (!this.state.isActive) return;

    if (isFinal) {
      // Process complete sentence
      this.speechBuffer += " " + text;
      
      // Check for sentence endings
      if (/[.!?]$/.test(text.trim())) {
        await this.processSpeech(this.speechBuffer.trim());
        this.speechBuffer = "";
      }
    } else {
      // Accumulate partial transcriptions
      this.speechBuffer += " " + text;
    }
  }

  // Get translation history
  getHistory(): TranslationEntry[] {
    return this.state.translationHistory;
  }

  // Clear translation history
  clearHistory() {
    this.state.translationHistory = [];
  }

  // Get current state
  getState(): TranslationState {
    return this.state;
  }
}

// ---------- Translation Commands ----------
export const TRANSLATION_COMMANDS = {
  START: /^(start|begin|activate)\s+(translation|translator|translate)/i,
  STOP: /^(stop|end|deactivate)\s+(translation|translator|translate)/i,
  SWAP: /^(swap|switch|reverse)\s+(languages?)/i,
  CHANGE_LANGUAGE: /^(change|set)\s+(target\s+)?language\s+to\s+(\w+)/i,
  HELP: /^(translation|translator)\s+help/i
};

// Helper to detect language from speech
export function detectLanguageFromSpeech(text: string): LanguageCode | null {
  const languagePatterns: Record<LanguageCode, RegExp[]> = {
    'es': [/\b(español|spanish|mexico|spain)\b/i],
    'fr': [/\b(français|french|france)\b/i],
    'de': [/\b(deutsch|german|germany)\b/i],
    'it': [/\b(italiano|italian|italy)\b/i],
    'pt': [/\b(português|portuguese|brazil|portugal)\b/i],
    'zh': [/\b(中文|chinese|mandarin|china)\b/i],
    'ja': [/\b(日本語|japanese|japan)\b/i],
    'ko': [/\b(한국어|korean|korea)\b/i],
    'ar': [/\b(العربية|arabic|arab)\b/i],
    'hi': [/\b(हिंदी|hindi|india)\b/i],
    'ru': [/\b(русский|russian|russia)\b/i],
    'en': [/\b(english|american|british)\b/i]
  };

  for (const [lang, patterns] of Object.entries(languagePatterns)) {
    if (patterns.some(pattern => pattern.test(text))) {
      return lang as LanguageCode;
    }
  }

  return null;
}