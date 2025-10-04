# Rescue CPR - Mentra Client

This is the Mentra Live smart glasses client for the Rescue CPR app.

## Features

- 🎯 **Wake Word Detection**: Say "start rescue" to begin CPR guidance
- 🎤 **Voice Commands**: Full voice-controlled CPR flow
- 📸 **Photo Capture**: Real-time hand position checking
- 🔊 **Audio Metronome**: 100/110/120 BPM compression timing
- 💾 **Photo Storage**: Local and backend photo saving

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Start development server:
   ```bash
   bun run dev
   ```

## Voice Commands

- **"start rescue"** - Begin CPR guidance
- **"yes good"** - Confirm scene is safe
- **"not good"** - Scene has hazards
- **"yes responding"** - Person is responsive
- **"no response"** - Person is unresponsive
- **"check hands"** - Capture photo for hand position
- **"change speed"** - Cycle through BPM (100→110→120)

## Photo Storage

Photos are saved in two locations:
- **Local**: `hands-positioning/` folder
- **Backend**: Sent to backend API for analysis and storage

## Backend Integration

The app works with the FastAPI backend in the `../backend/` directory:
- **Analysis**: `/analyze-hands` endpoint
- **Storage**: `/upload-photo` endpoint
- **Fallback**: Local mock analysis if backend unavailable
