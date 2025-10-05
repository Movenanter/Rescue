# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Rescue CPR is an AI-powered CPR guidance system designed for Mentra Live smart glasses with real-time hand position analysis using MediaPipe and TensorFlow. The project consists of three main components: a Mentra smart glasses client, a FastAPI backend with ML models, and a React frontend dashboard.

## Development Commands

### Backend (FastAPI + TensorFlow)
```bash
# Navigate to backend
cd backend

# Install dependencies in virtual environment
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env to add API keys for OpenAI, Replicate, etc.

# Run backend server
python main.py  # Runs on http://localhost:8000

# Alternative startup with logging
./start.sh

# Test the TFLite model
python test_tflite_backend.py

# API documentation available at
# http://localhost:8000/docs
```

### Frontend (React + TypeScript)
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment
echo "VITE_API_BASE_URL=http://localhost:8000" > .env

# Run development server
npm run dev  # Runs on http://localhost:3000

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

### Mentra Smart Glasses Client (Bun + TypeScript)
```bash
# Navigate to Mentra client
cd mentra

# Install dependencies
bun install

# Run development with hot reload
bun run dev

# Build TypeScript
bun run build

# Start production
bun run start
```

## Architecture Overview

### Service Communication Flow
```
Mentra Glasses <---> Backend API <---> ML Models
                         ^
                         |
                    Frontend Dashboard
```

### Backend ML Pipeline
The backend uses a fallback chain for CPR analysis:
1. **Replicate Vision Model** (if configured) - Advanced vision analysis
2. **External ML Service** (if available) - Roboflow or custom ML endpoint
3. **Local TFLite Model** - Lightweight on-device inference with MediaPipe pose detection

### Key API Endpoints
- `POST /analyze-pose` - Main CPR technique analysis endpoint with multi-model fallback
- `POST /save-photo` - Store training photos with analysis
- `POST /generate-summary` - AI-powered session summary generation (requires OpenAI)
- `GET /health` - Detailed health status including model availability

### Model Architecture
The TFLite model (`ml/cpr_model.tflite`) predicts 13 CPR metrics:
- Arm angle and compression depth
- Compression rate and hand position offsets
- Overall quality score and compression phase
- Adaptive metronome parameters

### Mentra Client State Machine
The glasses app follows a strict state flow:
1. **Initialization** → Wake word detection ("start rescue")
2. **Safety Check** → Scene safety verification
3. **Responsiveness Check** → Patient consciousness check
4. **Compressions** → Main CPR guidance with metronome
5. **Settings** → Adjust BPM and preferences

Voice commands are processed through dual NLU:
- Primary: Gemini 2.5 Flash (if API key configured)
- Fallback: State-aware heuristic pattern matching

## Environment Variables

### Required API Keys
```bash
# Backend (.env)
OPENAI_API_KEY=         # For AI summaries
REPLICATE_API_TOKEN=    # For vision analysis
ROBOFLOW_API_KEY=       # For ML service

# Mentra (environment)
MENTRAOS_API_KEY=       # Required for glasses SDK
GEMINI_API_KEY=         # Optional for advanced NLU
```

### Service Configuration
```bash
# Backend ports and hosts
BACKEND_PORT=8000
ML_SERVICE_URL=http://localhost:5001
REDIS_HOST=localhost

# Feature flags
USE_REPLICATE=true
USE_ML_SERVICE=true
DEVELOPMENT_MODE=true
```

## Testing Strategy

### Backend Testing
```bash
# Test TFLite model with dataset
python test_tflite_backend.py

# Test individual endpoints
curl -X POST http://localhost:8000/analyze-pose \
  -F "file=@test_image.jpg"

# Check model status
curl http://localhost:8000/health
```

### Frontend Testing
The frontend includes mock data fallback when backend is unavailable. Check the connection indicator (green = connected, red = demo mode).

## Data Flow for CPR Analysis

1. **Image Capture**: Mentra glasses capture photo via `CHECK_HANDS` command
2. **Multi-Model Analysis**: Backend attempts Replicate → ML Service → TFLite
3. **Pose Detection**: MediaPipe extracts 33 body landmarks
4. **Metric Prediction**: TFLite model outputs 13 normalized metrics
5. **Denormalization**: Metrics converted to real-world units (degrees, inches, BPM)
6. **Feedback Generation**: Rule-based feedback from predicted values
7. **Response**: JSON with pose status, metrics, and actionable feedback

## Voice Command Processing

The Mentra client uses context-aware intent classification:
```typescript
// State-specific intents
responsiveness_check: "yes responding" | "no response"
compressions: "check hands" | "change speed"
settings: "back to compressions"
```

## Photo Storage Structure
```
backend/backend_photos/     # Server-side with full analysis
mentra/hands-positioning/    # Client-side with local cache
```

## Common Development Tasks

### Adding New Voice Commands
1. Update `IntentName` type in `mentra/src/index.ts`
2. Add Gemini prompt context in `INTENT_SYSTEM_PROMPT`
3. Add heuristic pattern in `classifyIntentHeuristic()`
4. Implement handler in corresponding state

### Updating ML Model
1. Train new model using `backend/ml/CPR (2).ipynb`
2. Export as TFLite: `converter.convert()`
3. Replace `backend/ml/cpr_model.tflite`
4. Update denormalization ranges in `main.py`

### Adding API Endpoints
1. Define Pydantic models for request/response
2. Add endpoint handler in `backend/main.py`
3. Update frontend API service in `frontend/src/services/api.ts`
4. Add to health check status if critical

## Performance Optimization

### Backend Optimization
- TFLite model inference: <50ms on CPU
- MediaPipe pose detection: ~30ms per image
- Replicate API calls: 2-5s (cached when possible)
- Use Redis for session caching (if configured)

### Mentra Client Optimization
- Audio preloading for zero-latency metronome
- Debounced photo capture (minimum 5 compressions between photos)
- Speech guard to prevent prompt interruption during compressions

## Debugging Tips

### Backend Issues
```bash
# Check logs
tail -f backend/backend.log

# Verify model loading
python -c "import tensorflow as tf; print(tf.__version__)"

# Test MediaPipe
python -c "import mediapipe as mp; print('MediaPipe OK')"
```

### Frontend Connection Issues
1. Check CORS configuration in backend
2. Verify VITE_API_BASE_URL matches backend address
3. Check browser console for specific errors
4. Fallback to mock data indicates backend unreachable

### Mentra Audio Issues
- Ensure TICK_URL points to accessible audio file
- Adjust TICK_VOLUME (0.0-1.0) and AUDIO_LEAD_MS
- Enable PREWARM for first-beat latency reduction

## External Dependencies

### Critical Services
- **Mentra SDK**: Smart glasses interface (`@mentra/sdk`)
- **TensorFlow Lite**: Lightweight ML inference
- **MediaPipe**: Real-time pose detection
- **OpenAI API**: Session summary generation

### Optional Enhancements
- **Replicate**: Advanced vision models
- **Gemini 2.5**: Natural language understanding
- **Roboflow**: External ML service integration
- **Redis**: Session state caching