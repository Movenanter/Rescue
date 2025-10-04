from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import base64
import io
import os
from typing import Dict, Any
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create photos directory
PHOTOS_DIR = "backend_photos"
os.makedirs(PHOTOS_DIR, exist_ok=True)

app = FastAPI(title="Rescue CPR Backend", version="1.0.0")

# Enable CORS for glasses communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for mock analysis
mock_results = [
    {"position": "good", "confidence": 0.95},
    {"position": "high", "confidence": 0.87},
    {"position": "low", "confidence": 0.82},
    {"position": "left", "confidence": 0.76},
    {"position": "right", "confidence": 0.81},
    {"position": "uncertain", "confidence": 0.45}
]
mock_index = 0

def analyze_hand_placement(image_data: bytes) -> Dict[str, Any]:
    """
    Analyze hand placement in CPR photo.
    Currently returns mock data, but ready for real ML implementation.
    """
    global mock_index
    
    try:
        # Simple mock analysis without image processing
        logger.info(f"Analyzing image: {len(image_data)} bytes")
        
        # TODO: Replace with real computer vision analysis
        # For now, cycle through mock results
        result = mock_results[mock_index % len(mock_results)]
        mock_index += 1
        
        logger.info(f"Analysis result: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}")
        return {"position": "uncertain", "confidence": 0.0}

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Rescue CPR Backend is running", "status": "healthy"}

@app.post("/analyze-hands")
async def analyze_hands(file: UploadFile = File(...)):
    """
    Analyze hand placement in CPR photo.
    Returns guidance for hand positioning.
    """
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        logger.info(f"Received photo: {file.filename}, size: {len(image_data)} bytes")
        
        # Analyze hand placement
        analysis_result = analyze_hand_placement(image_data)
        
        # Generate guidance message
        guidance_messages = {
            "good": "Hands are centered perfectly. Keep going!",
            "high": "Hands are too high. Move down toward the center of the chest.",
            "low": "Hands are too low. Move up toward the center of the chest.",
            "left": "Move hands slightly to the right, toward the center of the chest.",
            "right": "Move hands slightly to the left, toward the center of the chest.",
            "uncertain": "Hand position unclear. Try to center hands on the chest."
        }
        
        guidance = guidance_messages.get(analysis_result["position"], "Continue with compressions.")
        
        response = {
            "success": True,
            "analysis": analysis_result,
            "guidance": guidance,
            "timestamp": "2024-01-01T00:00:00Z"  # You can use datetime.now().isoformat()
        }
        
        logger.info(f"Analysis complete: {response}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing photo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing photo: {str(e)}")

@app.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    user_id: str = None,
    session_id: str = None,
    timestamp: str = None
):
    """
    Upload and store photo for QA purposes.
    Returns confirmation of successful upload.
    """
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Save photo to backend directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"cpr_photo_{user_id or 'unknown'}_{timestamp}.jpg"
        filepath = os.path.join(PHOTOS_DIR, filename)
        
        with open(filepath, "wb") as f:
            f.write(image_data)
        
        logger.info(f"Photo saved to backend: {filepath} (user={user_id}, session={session_id}, size={len(image_data)} bytes)")
        
        return {
            "success": True,
            "message": "Photo uploaded successfully",
            "user_id": user_id,
            "session_id": session_id,
            "file_size": len(image_data),
            "saved_path": filepath
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading photo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading photo: {str(e)}")

@app.get("/photos")
async def list_photos():
    """List all saved photos"""
    try:
        photos = []
        for filename in os.listdir(PHOTOS_DIR):
            if filename.endswith(('.jpg', '.jpeg', '.png')):
                filepath = os.path.join(PHOTOS_DIR, filename)
                stat = os.stat(filepath)
                photos.append({
                    "filename": filename,
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat()
                })
        
        photos.sort(key=lambda x: x["created"], reverse=True)  # Newest first
        
        return {
            "success": True,
            "photos": photos,
            "count": len(photos)
        }
    except Exception as e:
        logger.error(f"Error listing photos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing photos: {str(e)}")

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "rescue-cpr-backend",
        "version": "1.0.0",
        "endpoints": ["/", "/analyze-hands", "/upload-photo", "/photos", "/health"],
        "photos_directory": PHOTOS_DIR
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
