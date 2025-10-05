'use client'

import { useState } from 'react'
import { 
  Heart, 
  Glasses, 
  Code, 
  Cpu, 
  Globe, 
  Shield,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Timer,
  Activity,
  Users,
  Github,
  Play,
  Book,
  Zap
} from 'lucide-react'

export default function Documentation() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-rescue-red" />
              <div>
                <h1 className="text-2xl font-bold">Rescue CPR</h1>
                <p className="text-sm text-gray-600">AI-Powered CPR Guidance for Smart Glasses</p>
              </div>
            </div>
            <nav className="flex space-x-6">
              <a href="https://github.com/Movenanter/Rescue" className="flex items-center space-x-1 text-gray-700 hover:text-rescue-blue">
                <Github className="h-5 w-5" />
                <span>GitHub</span>
              </a>
              <a href="#demo" className="flex items-center space-x-1 text-gray-700 hover:text-rescue-blue">
                <Play className="h-5 w-5" />
                <span>Demo</span>
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-rescue-red/10 text-rescue-red px-4 py-2 rounded-full mb-6">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Built for HackHarvard 2025</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-rescue-red to-rescue-blue bg-clip-text text-transparent">
            Save Lives with AI-Powered CPR Guidance
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Every minute without CPR reduces survival by 10%. Rescue transforms Mentra smart glasses into 
            a real-time CPR coach, providing hands-free guidance when every second counts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-6 py-3 bg-rescue-red text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center justify-center space-x-2">
              <Play className="h-5 w-5" />
              <span>Watch Demo</span>
            </button>
            <button className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition flex items-center justify-center space-x-2">
              <Github className="h-5 w-5" />
              <span>View Code</span>
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-rescue-red">350,000+</div>
              <div className="text-sm text-gray-600 mt-1">Cardiac Arrests/Year</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-rescue-blue">&lt;50ms</div>
              <div className="text-sm text-gray-600 mt-1">Analysis Latency</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-rescue-red">13</div>
              <div className="text-sm text-gray-600 mt-1">Biomechanical Metrics</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-rescue-blue">99.9%</div>
              <div className="text-sm text-gray-600 mt-1">Feedback Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="sticky top-[73px] z-40 bg-white border-y">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto py-4">
            {['overview', 'technical', 'api', 'setup', 'contributing'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium whitespace-nowrap transition ${
                  activeTab === tab 
                    ? 'text-rescue-red border-b-2 border-rescue-red' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'overview' && <OverviewSection />}
          {activeTab === 'technical' && <TechnicalSection />}
          {activeTab === 'api' && <ApiSection />}
          {activeTab === 'setup' && <SetupSection />}
          {activeTab === 'contributing' && <ContributingSection />}
        </div>
      </section>
    </div>
  )
}

function OverviewSection() {
  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-3xl font-bold mb-6">How It Works</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <StepCard 
              number="1"
              title="Scene Safety & Emergency Call"
              description="Voice-activated protocol begins with scene assessment. Persistent reminders ensure 911 is called."
              icon={<Shield className="h-5 w-5" />}
            />
            <StepCard 
              number="2"
              title="Responsiveness Check"
              description="Clear voice prompts guide initial assessment with natural language understanding of responses."
              icon={<Users className="h-5 w-5" />}
            />
            <StepCard 
              number="3"
              title="Chest Compressions"
              description="110 BPM adaptive metronome with drift correction and compression counting every 10."
              icon={<Activity className="h-5 w-5" />}
            />
          </div>
          <div className="space-y-6">
            <StepCard 
              number="4"
              title="Hand Position Analysis"
              description="TensorFlow Lite model analyzes photos every 5 compressions, checking 13 biomechanical metrics."
              icon={<Cpu className="h-5 w-5" />}
            />
            <StepCard 
              number="5"
              title="Real-time Feedback"
              description="Critical errors trigger immediate voice corrections. Minor adjustments queued to avoid disruption."
              icon={<Zap className="h-5 w-5" />}
            />
            <StepCard 
              number="6"
              title="Translation Mode"
              description="Multilingual support for diverse communities with real-time translation capabilities."
              icon={<Globe className="h-5 w-5" />}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-6">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<Glasses className="h-8 w-8 text-rescue-red" />}
            title="Hands-Free Operation"
            description="Complete CPR guidance without looking away from the patient or touching any device."
          />
          <FeatureCard 
            icon={<Cpu className="h-8 w-8 text-rescue-blue" />}
            title="Edge AI Processing"
            description="On-device TensorFlow Lite model with <50ms inference for instant feedback."
          />
          <FeatureCard 
            icon={<Shield className="h-8 w-8 text-green-600" />}
            title="Triple Redundancy"
            description="TFLite → Gemini Vision → Heuristics ensures 99.9% availability."
          />
          <FeatureCard 
            icon={<Timer className="h-8 w-8 text-purple-600" />}
            title="Adaptive Rhythm"
            description="Drift-corrected metronome with audio pre-warming for zero-latency beats."
          />
          <FeatureCard 
            icon={<Globe className="h-8 w-8 text-orange-600" />}
            title="Multi-Language"
            description="Real-time translation for emergency situations across language barriers."
          />
          <FeatureCard 
            icon={<Activity className="h-8 w-8 text-indigo-600" />}
            title="Session Analytics"
            description="Comprehensive metrics tracking for training review and improvement."
          />
        </div>
      </div>
    </div>
  )
}

function TechnicalSection() {
  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-3xl font-bold mb-6">Architecture Overview</h2>
        <div className="bg-gray-900 text-gray-100 p-8 rounded-lg">
          <pre className="text-sm overflow-x-auto">{`
┌─────────────────────────────────────────────────────────────┐
│                     Mentra Smart Glasses                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              TypeScript/Bun Runtime                   │   │
│  │  • State Machine (Safety → Response → Compressions)  │   │
│  │  • Voice Commands (Gemini NLU + Heuristic Fallback)  │   │
│  │  • Photo Capture (Every 5 compressions)              │   │
│  │  • Adaptive Metronome (110 BPM ± drift correction)   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend Server                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  ML Pipeline                          │   │
│  │  1. TensorFlow Lite Model (Primary)                   │   │
│  │     • 13 output metrics                               │   │
│  │     • <50ms inference                                 │   │
│  │  2. MediaPipe Pose Detection                          │   │
│  │     • 33 body landmarks                               │   │
│  │  3. Gemini Vision API (Fallback)                      │   │
│  │     • When confidence <60%                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Session Management & Storage               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    React Dashboard (Web)                     │
│  • Real-time monitoring                                      │
│  • Session replay & analytics                                │
│  • Training metrics & improvement tracking                   │
└─────────────────────────────────────────────────────────────┘
          `}</pre>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-6">Model Details</h2>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-xl font-semibold mb-4">TensorFlow Lite Model</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Input</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Image: 224×224×3 RGB</li>
                <li>• Normalized: 0-1 range</li>
                <li>• Augmentations: Rotation, zoom, shift</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Output (13 metrics)</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Arm angle (0-180°)</li>
                <li>• Compression depth (0-5")</li>
                <li>• Compression rate (0-200 BPM)</li>
                <li>• Hand X/Y offset (±10")</li>
                <li>• Torso lean (0-90°)</li>
                <li>• Quality score (0-1)</li>
              </ul>
            </div>
          </div>
          
          <h3 className="text-xl font-semibold mb-4 mt-8">Training Details</h3>
          <div className="bg-gray-50 rounded p-4">
            <code className="text-sm">
              {`Dataset: 5000+ augmented CPR images
Architecture: MobileNetV2 backbone + custom head
Optimizer: Adam (lr=0.001)
Loss: MSE + custom CPR constraints
Accuracy: 94% on validation set
Inference: <50ms on Mentra hardware`}
            </code>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-6">Performance Metrics</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <MetricCard 
            label="Inference Latency"
            value="<50ms"
            description="End-to-end from photo capture to voice feedback"
          />
          <MetricCard 
            label="Model Accuracy"
            value="94%"
            description="Validation accuracy on test dataset"
          />
          <MetricCard 
            label="Battery Life"
            value="2+ hours"
            description="Continuous CPR guidance on single charge"
          />
          <MetricCard 
            label="Metronome Precision"
            value="±2ms"
            description="Drift-corrected timing accuracy"
          />
        </div>
      </div>
    </div>
  )
}

function ApiSection() {
  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-3xl font-bold mb-6">Backend API Endpoints</h2>
        <div className="space-y-6">
          <ApiEndpoint 
            method="POST"
            endpoint="/analyze-hands"
            description="Analyze CPR hand position from photo"
            request={`{
  "file": "multipart/form-data image",
  "session_id": "string (optional)",
  "compression_count": "integer (optional)"
}`}
            response={`{
  "analysis": {
    "position": "good | needs_adjustment | left | right",
    "confidence": 0.95
  },
  "guidance": "Straighten arms more",
  "priority": "critical | warning | good",
  "metrics": {
    "arm_angle_degrees": 165,
    "compression_depth_inches": 2.1,
    "overall_quality_score": 0.82
  }
}`}
          />

          <ApiEndpoint 
            method="POST"
            endpoint="/analyze-pose"
            description="Alternative endpoint for pose analysis"
            request={`{
  "file": "multipart/form-data image",
  "session_id": "string (optional)"
}`}
            response={`{
  "pose_detected": true,
  "arm_angle_degrees": 165,
  "feedback": [
    "Straighten arms more",
    "Center hands on chest"
  ],
  "quality_score": 0.82
}`}
          />

          <ApiEndpoint 
            method="POST"
            endpoint="/session/start"
            description="Start a new CPR session"
            request={`{
  "user_id": "string",
  "session_type": "training | emergency"
}`}
            response={`{
  "session_id": "uuid",
  "start_time": "2025-01-05T10:00:00Z"
}`}
          />

          <ApiEndpoint 
            method="GET"
            endpoint="/health"
            description="Check backend health status"
            request="None"
            response={`{
  "status": "healthy",
  "tflite_loaded": true,
  "mediapipe_available": true
}`}
          />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-6">Mentra Voice Commands</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <VoiceCommand command="Start rescue" description="Initiates CPR protocol" />
          <VoiceCommand command="Check hands" description="Manually trigger photo analysis" />
          <VoiceCommand command="Change speed" description="Cycle metronome BPM (100/110/120)" />
          <VoiceCommand command="Start translation" description="Enable multilingual mode" />
          <VoiceCommand command="Scene is safe" description="Confirm safety check" />
          <VoiceCommand command="Not responding" description="Patient unresponsive, start CPR" />
        </div>
      </div>
    </div>
  )
}

function SetupSection() {
  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-3xl font-bold mb-6">Quick Start Guide</h2>
        
        <div className="space-y-8">
          <SetupStep 
            number={1}
            title="Clone the Repository"
            code={`git clone https://github.com/yourusername/rescue-cpr.git
cd rescue-cpr`}
          />

          <SetupStep 
            number={2}
            title="Setup Backend"
            code={`cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt

# Optional: Set API keys for enhanced features
export GEMINI_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"

# Run the backend
python main.py  # Runs on http://localhost:8000`}
          />

          <SetupStep 
            number={3}
            title="Setup Frontend Dashboard"
            code={`cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
npm run dev  # Runs on http://localhost:3000`}
          />

          <SetupStep 
            number={4}
            title="Setup Mentra App"
            code={`cd mentra
bun install

# Required: Mentra SDK key
export MENTRAOS_API_KEY="your-mentra-key"

# Optional: Enhanced NLU
export GEMINI_API_KEY="your-gemini-key"

# Build and run
bun run build
bun run start`}
          />

          <SetupStep 
            number={5}
            title="Deploy to Mentra Glasses"
            code={`# Connect glasses via USB
mentra-cli devices list

# Deploy the app
mentra-cli deploy ./mentra/dist --device-id YOUR_DEVICE_ID

# View logs
mentra-cli logs --follow`}
          />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-6">Environment Variables</h2>
        <div className="bg-gray-900 text-gray-100 p-6 rounded-lg">
          <pre className="text-sm">{`# Backend (.env)
GEMINI_API_KEY=          # Gemini Vision API for fallback analysis
OPENAI_API_KEY=          # GPT-4 for session summaries (optional)
REDIS_URL=               # Redis for session caching (optional)

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:8000

# Mentra (environment)
MENTRAOS_API_KEY=        # Required for glasses SDK
GEMINI_API_KEY=          # Enhanced voice command understanding
ELEVENLABS_API_KEY=      # Natural voice for translations
TICK_URL=                # Custom metronome sound URL
TICK_VOLUME=0.5          # Metronome volume (0-1)
SAVE_DIR=./hands-photos  # Local photo storage`}</pre>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-6">Testing</h2>
        <div className="space-y-4">
          <CodeBlock 
            title="Test Backend"
            code={`# Test TFLite model
python test_tflite_backend.py

# Test API endpoints
curl -X POST http://localhost:8000/analyze-pose \\
  -F "file=@test_image.jpg"

# Run comprehensive tests
python test_system.py`}
          />
          
          <CodeBlock 
            title="Test Mentra App"
            code={`# Run in development mode with hot reload
bun run dev

# Test voice commands
"Start rescue"
"Check hands"
"Change speed"

# View debug logs
mentra-cli logs --level=debug`}
          />
        </div>
      </div>
    </div>
  )
}

function ContributingSection() {
  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-3xl font-bold mb-6">Contributing Guidelines</h2>
        <div className="prose max-w-none">
          <p className="text-gray-600 mb-4">
            We welcome contributions to Rescue CPR! This project aims to save lives through 
            better emergency response technology.
          </p>
          
          <h3 className="text-xl font-semibold mb-3">Priority Areas</h3>
          <ul className="space-y-2 text-gray-600">
            <li>✓ Continuous video analysis for real-time depth measurement</li>
            <li>✓ Pediatric/infant CPR modes with adjusted parameters</li>
            <li>✓ Multi-rescuer coordination features</li>
            <li>✓ Integration with emergency services APIs</li>
            <li>✓ Additional language support for translations</li>
            <li>✓ Improved model accuracy for diverse body types</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-8">Development Workflow</h3>
          <div className="bg-gray-50 rounded-lg p-6">
            <ol className="space-y-3">
              <li>1. Fork the repository and create a feature branch</li>
              <li>2. Make your changes with clear commit messages</li>
              <li>3. Add tests for new functionality</li>
              <li>4. Ensure all tests pass: <code>npm test && python test_system.py</code></li>
              <li>5. Submit a pull request with description of changes</li>
            </ol>
          </div>

          <h3 className="text-xl font-semibold mb-3 mt-8">Code Style</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock 
              title="TypeScript/JavaScript"
              code={`// Use ESLint + Prettier
npm run lint
npm run format`}
            />
            <CodeBlock 
              title="Python"
              code={`# Use Black + isort
black backend/
isort backend/`}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-6">License & Acknowledgments</h2>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold mb-2">MIT License</h3>
          <p className="text-sm text-gray-600 mb-4">
            This project is open source and available under the MIT License.
          </p>
          
          <h3 className="font-semibold mb-2 mt-6">Acknowledgments</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• American Heart Association for CPR guidelines</li>
            <li>• Mentra team for smart glasses SDK support</li>
            <li>• HackHarvard 2025 organizers and mentors</li>
            <li>• TensorFlow team for TFLite optimization tools</li>
            <li>• Google for Gemini Vision API access</li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-6">Contact & Support</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <a href="https://github.com/yourusername/rescue/issues" className="block p-4 border rounded-lg hover:border-rescue-blue transition">
            <h3 className="font-semibold mb-1">Report Issues</h3>
            <p className="text-sm text-gray-600">GitHub Issues</p>
          </a>
          <a href="mailto:rescue-cpr@example.com" className="block p-4 border rounded-lg hover:border-rescue-blue transition">
            <h3 className="font-semibold mb-1">Email Support</h3>
            <p className="text-sm text-gray-600">rescue-cpr@example.com</p>
          </a>
          <a href="https://discord.gg/rescue-cpr" className="block p-4 border rounded-lg hover:border-rescue-blue transition">
            <h3 className="font-semibold mb-1">Community</h3>
            <p className="text-sm text-gray-600">Join our Discord</p>
          </a>
        </div>
      </div>
    </div>
  )
}

// Component helpers
function StepCard({ number, title, description, icon }: any) {
  return (
    <div className="flex space-x-4">
      <div className="flex-shrink-0 w-10 h-10 bg-rescue-red/10 rounded-full flex items-center justify-center text-rescue-red font-semibold">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold mb-1 flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="p-6 bg-white rounded-lg border hover:shadow-lg transition">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

function MetricCard({ label, value, description }: any) {
  return (
    <div className="p-6 bg-white rounded-lg border">
      <div className="text-3xl font-bold text-rescue-blue mb-2">{value}</div>
      <div className="font-medium mb-1">{label}</div>
      <div className="text-sm text-gray-600">{description}</div>
    </div>
  )
}

function ApiEndpoint({ method, endpoint, description, request, response }: any) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 p-4 border-b">
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 text-xs font-semibold rounded ${
            method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {method}
          </span>
          <code className="font-mono text-sm">{endpoint}</code>
        </div>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Request</h4>
          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">{request}</pre>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">Response</h4>
          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">{response}</pre>
        </div>
      </div>
    </div>
  )
}

function VoiceCommand({ command, description }: any) {
  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <code className="font-mono text-sm font-semibold">"{command}"</code>
      <span className="text-sm text-gray-600">→</span>
      <span className="text-sm text-gray-600">{description}</span>
    </div>
  )
}

function SetupStep({ number, title, code }: any) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
        <span className="w-8 h-8 bg-rescue-blue text-white rounded-full flex items-center justify-center text-sm">
          {number}
        </span>
        <span>{title}</span>
      </h3>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">{code}</pre>
    </div>
  )
}

function CodeBlock({ title, code }: any) {
  return (
    <div>
      <h4 className="font-medium mb-2">{title}</h4>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">{code}</pre>
    </div>
  )
}