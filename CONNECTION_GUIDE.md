# Frontend-Backend Connection Guide

This guide explains how to connect the React frontend to the FastAPI backend and use AI-powered features.

## 🚀 Quick Setup

### 1. Backend Setup

```bash
cd backend

# Install requirements (including new OpenAI dependency)
pip install -r requirements.txt

# Set up environment variables
echo "OPENAI_API_KEY=your_actual_openai_api_key" > .env
echo "DEVELOPMENT_MODE=true" >> .env

# Start the backend server
python main.py
```

The backend will run on `http://localhost:8000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
echo "VELOPMENT_MODE=true" >> .env

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

#### Backend (`.env`)
- `OPENAI_API_KEY`: Your OpenAI API key for AI summary generation
- `DEVELOPMENT_MODE`: Enable development features (true/false)

#### Frontend (`.env`)
- `VITE_API_BASE_URL`: Backend API URL (default: http://localhost:8000)
- `VELOPMENT_MODE`: Enable development features (true/false)

## 🎯 What's Connected

### ✅ AI-Powered Features

1. **Real-time CPR Analysis**
   - Upload photos during training sessions
   - Get instant feedback on hand positioning, compression depth, etc.
   - Endpoint: `POST /analyze-hands`

2. **AI-Generated Summaries**
   - Automatic session analysis and summary generation
   - Personalized recommendations based on performance
   - Endpoint: `POST /generate-summary`

### ✅ Connected Components

1. **Dashboard**
   - Shows backend connection status
   - Loads real session data when available
   - Falls back to mock data if backend unavailable

2. **Training Session**
   - Image capture and analysis
   - Real-time feedback from AI analysis
   - Visual indicators for AI readiness

3. **After Action Report**
   - AI-generated session summaries
   - Enhanced analysis with OpenAI insights

4. **Profile Settings**
   - User profile updates via API
   - Backend integration ready

## 🔍 Connection Status

The frontend shows connection status with colored indicators:

- 🟢 **Green**: Backend connected - Full AI functionality available
- 🔴 **Red**: Backend disconnected - Demo mode with mock data

## 🛠️ API Endpoints

### Core Endpoints
- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /analyze-hands` - Analyze CPR technique from image
- `POST /upload-photo` - Upload and analyze photo
- `POST /generate-summary` - Generate AI-powered session summary

### Example Usage

#### Analyze CPR Technique
```javascript
const file = event.target.files[0]
const result = await apiService.analyzeHands(file)
console.log(result.guidance)
```

#### Generate AI Summary
```javascript
const summary = await apiService.generateSummary(sessionId, {
  totalCorrections: 3,
  criticalErrors: 1,
  performanceScore: 82,
  // ... more data
})
```

## 🚨 Troubleshooting

### Backend Won't Start
1. Check Python dependencies: `pip install -r requirements.txt`
2. Verify OpenAI API key is set correctly
3. Check port 8000 is available

### Frontend Can't Connect
1. Verify backend is running on port 8000
2. Check `.env` file has correct `VITE_API_BASE_URL`
3. Check browser console for CORS errors

### AI Features Not Working
1. Verify OpenAI API key is valid and has credits
2. Check backend logs for OpenAI errors
3. Ensure internet connection for OpenAI API calls

### Mock Data Fallback
If backend is unavailable, the app gracefully falls back to mock data with an indicator showing "Demo Mode".

## 🔄 Development Workflow

1. **Start Backend**: Always start backend first
2. **Start Frontend**: Then start frontend development server
3. **Check Connection**: Look for green connection indicator
4. **Test Features**: Try image capture and analysis
5. **View Reports**: Generate AI summaries in reports

## 📁 Project Structure

```
Rescue/
├── backend/
│   ├── main.py                 # FastAPI server with AI endpoints
│   ├── requirements.txt        # Python dependencies + OpenAI
│   └── .env                   # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── config/
│   │   │   └── api.ts         # Axios configuration
│   │   ├── services/
│   │   │   └── api.ts         # API service layer
│   │   └── components/        # Updated to use API
│   └── .env                   # Frontend environment variables
└── CONNECTION_GUIDE.md        # This guide
```

## 🎊 What's New

- ✅ Environment-based configuration (no hardcoded URLs)
- ✅ AI-powered CPR analysis and summaries
- ✅ Real-time feedback during training
- ✅ Graceful fallback to demo mode
- ✅ Connection status indicators
- ✅ Comprehensive error handling
- ✅ Modular API service architecture

All components now connect to the backend while maintaining a smooth user experience with intelligent fallbacks!
