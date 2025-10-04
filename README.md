# Rescue CPR - Complete System

A voice-controlled CPR guidance app for Mentra Live smart glasses with backend photo analysis.

## Project Structure

```
Rescue/
├── mentra/           # Mentra Live client (smart glasses app)
│   ├── src/          # TypeScript source code
│   ├── package.json  # Node.js dependencies
│   ├── hands-positioning/  # Local photo storage
│   └── README.md     # Client documentation
├── backend/          # FastAPI server
│   ├── main.py       # Python backend code
│   ├── requirements.txt  # Python dependencies
│   ├── backend_photos/   # Server photo storage
│   └── README.md     # Backend documentation
└── dataset/          # Training data (if any)
```

## Quick Start

### 1. Start the Backend Server
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Server runs at: http://localhost:8000

### 2. Start the Mentra Client
```bash
cd mentra
bun install
bun run dev
```
Client runs at: http://localhost:3000

## Features

### 🎯 Mentra Client (Smart Glasses)
- **Wake Word**: "start rescue" to begin
- **Voice Control**: Full CPR flow via voice commands
- **Photo Capture**: Real-time hand position checking
- **Audio Metronome**: Compression timing at 100/110/120 BPM
- **Dual Storage**: Local + backend photo saving

### 🔧 Backend Server
- **Photo Analysis**: Hand position detection (mock)
- **Photo Storage**: Server-side photo management
- **REST API**: `/analyze-hands`, `/upload-photo`, `/photos`
- **CORS Enabled**: Cross-origin support for glasses

## API Endpoints

- `GET /` - Health check
- `POST /analyze-hands` - Analyze hand position from photo
- `POST /upload-photo` - Upload photo for storage
- `GET /photos` - List all saved photos
- `GET /health` - Detailed health status

## Voice Commands

- **"start rescue"** - Begin CPR guidance
- **"yes good"** - Scene is safe
- **"not good"** - Scene has hazards
- **"yes responding"** - Person is responsive
- **"no response"** - Person is unresponsive
- **"check hands"** - Capture photo for hand position
- **"change speed"** - Cycle BPM (100→110→120)

## Development

Both client and server support hot reloading during development. The system is designed to work with or without the backend - if the backend is unavailable, the client falls back to local mock analysis.

## Photo Storage

Photos are automatically saved in both locations:
- **Client**: `mentra/hands-positioning/`
- **Server**: `backend/backend_photos/`