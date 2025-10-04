# Rescue CPR Backend

FastAPI backend server for processing CPR photos from Mentra glasses.

## Features

- **Photo Upload**: Receive photos from smart glasses
- **Hand Analysis**: Analyze hand placement in CPR photos (currently mock)
- **Guidance Generation**: Provide real-time feedback on hand positioning
- **QA Storage**: Store photos for quality assurance
- **CORS Enabled**: Ready for cross-origin requests from glasses

## Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run the server:**
   ```bash
   python main.py
   ```

3. **Server will start at:** `http://localhost:8000`

## API Endpoints

### `GET /`
Health check endpoint.

### `POST /analyze-hands`
Analyze hand placement in CPR photo.

**Request:**
- `file`: Image file (multipart/form-data)

**Response:**
```json
{
  "success": true,
  "analysis": {
    "position": "good|high|low|left|right|uncertain",
    "confidence": 0.95
  },
  "guidance": "Hands are centered perfectly. Keep going!",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### `POST /upload-photo`
Upload photo for QA storage.

**Request:**
- `file`: Image file
- `user_id`: User identifier (optional)
- `session_id`: Session identifier (optional)
- `timestamp`: Upload timestamp (optional)

### `GET /health`
Detailed health check with service info.

## Integration with Glasses

Update your glasses code to send photos to this backend:

```typescript
// Replace the mock analysis with real API call
const response = await fetch('http://localhost:8000/analyze-hands', {
  method: 'POST',
  body: formData  // FormData with photo file
});

const result = await response.json();
```

## Future Enhancements

- **Real ML Analysis**: Replace mock analysis with computer vision
- **Cloud Storage**: Save photos to AWS S3 or Google Cloud
- **User Management**: Add user authentication
- **Analytics**: Track CPR performance metrics
- **Real-time Feedback**: WebSocket connections for live guidance

## Development

The server runs with auto-reload for development. Any changes to `main.py` will automatically restart the server.

For production deployment, use:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```
