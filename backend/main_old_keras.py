from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import base64
import io
import os
import cv2
import numpy as np
import tensorflow as tf
from typing import Dict, Any, Optional, List
import logging
import httpx
import asyncio
from urllib.parse import urljoin

# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import mediapipe, but handle if not available
import mediapipe as mp
from datetime import datetime
from PIL import Image
from pydantic import BaseModel
import openai
import json
from replicate_service import (
    analyze_with_replicate,
    convert_replicate_to_standard_format
)


# Environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:5000")
ML_SERVICE_TIMEOUT = int(os.getenv("ML_SERVICE_TIMEOUT", "30"))
USE_ML_SERVICE = os.getenv("USE_ML_SERVICE", "true").lower() == "true"

# Initialize OpenAI client if API key is provided
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY
else:
    logger.warning("OPENAI_API_KEY not found in environment variables")

# Create photos directory
PHOTOS_DIR = "backend_photos"
os.makedirs(PHOTOS_DIR, exist_ok=True)

app = FastAPI(title="Rescue CPR Backend", version="2.0.0")

# Pydantic models for API requests/responses
class SummaryRequest(BaseModel):
    sessionId: str
    analysisData: Dict[str, Any]

class SummaryResponse(BaseModel):
    summary: str

# Enable CORS for glasses communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import the model loader
from model_loader import load_cpr_model, CPRMetronomeModel, combined_loss

MODEL_PATH = "./cpr_model.keras"  # adjust path as needed
cnn_model = None
mp_pose = None
pose_detector = None

# HTTP client for ML service
ml_client = httpx.AsyncClient(
    base_url=ML_SERVICE_URL,
    timeout=ML_SERVICE_TIMEOUT
) if USE_ML_SERVICE else None

# Custom model classes and loss functions are now imported from model_loader

try:
    # Use the improved model loader
    cnn_model = load_cpr_model(MODEL_PATH, weights_only=False)
    if cnn_model:
        logger.info(f"Successfully loaded CNN model from {MODEL_PATH}")
    else:
        # Try loading with weights only as fallback
        cnn_model = load_cpr_model(MODEL_PATH, weights_only=True)
        if cnn_model:
            logger.info(f"Loaded CNN model using weights from {MODEL_PATH}")
        else:
            logger.error(f"Failed to load model from {MODEL_PATH}")
    
    # Initialize MediaPipe
    if mp:
        mp_pose = mp.solutions.pose
        pose_detector = mp_pose.Pose(
            static_image_mode=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("MediaPipe initialized")
except Exception as e:
    logger.error(f"Error in initialization: {e}")
    cnn_model = None

def get_angle(p1, p2, p3):
    """Calculate angle between three points"""
    v1 = p1 - p2
    v2 = p3 - p2
    cos = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
    return np.degrees(np.arccos(np.clip(cos, -1, 1)))

async def analyze_with_ml_service(image_bytes: bytes) -> Dict[str, Any]:
    """
    Analyze CPR technique using external ML service
    """
    try:
        if not ml_client:
            logger.error("ML service client not configured")
            return {"error": "ML service not available"}
        
        # Encode image to base64 for ML service
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Call ML service
        response = await ml_client.post(
            "/analyze-pose",
            json={"image": image_base64}
        )
        
        if response.status_code == 200:
            ml_result = response.json()
            
            # Convert ML service response to our format
            return {
                "pose_detected": ml_result.get("detected", False),
                "arm_angle": ml_result.get("metrics", {}).get("arm_angle", 0),
                "depth": ml_result.get("metrics", {}).get("compression_depth", 0),
                "hand_x": ml_result.get("metrics", {}).get("hand_position_error", 0.5),
                "hand_y": 0.5,
                "quality": ml_result.get("quality_score", 0) / 100,  # Convert to 0-1 scale
                "phase": 0.5,  # Default phase
                "feedback": ml_result.get("feedback", []),
                "ml_service_used": True
            }
        else:
            logger.error(f"ML service returned status {response.status_code}")
            return {"error": f"ML service error: {response.status_code}"}
            
    except httpx.TimeoutException:
        logger.error("ML service timeout")
        return {"error": "ML service timeout"}
    except Exception as e:
        logger.error(f"Error calling ML service: {e}")
        return {"error": str(e)}

async def analyze_cpr_image_with_replicate(image_bytes: bytes) -> Dict[str, Any]:
    """
    Analyze CPR technique from image using Replicate vision model with fallbacks
    Priority: 1) Replicate, 2) ML Service, 3) MediaPipe + CNN
    """
    
    # First, try Replicate for most detailed analysis
    logger.info("Attempting analysis with Replicate vision model...")
    replicate_result = await analyze_with_replicate(image_bytes)
    
    if not replicate_result.get("error"):
        # Successfully analyzed with Replicate
        logger.info("Successfully analyzed with Replicate")
        standard_format = convert_replicate_to_standard_format(replicate_result)
        standard_format["analysis_source"] = "replicate"
        return standard_format
    
    logger.warning(f"Replicate analysis failed: {replicate_result.get('error')}")
    
    # Second, try ML service if configured
    if USE_ML_SERVICE and ml_client:
        logger.info("Falling back to ML service...")
        ml_result = await analyze_with_ml_service(image_bytes)
        if not ml_result.get("error"):
            ml_result["analysis_source"] = "ml_service"
            return ml_result
    
    # Finally, fall back to local models
    logger.info("Falling back to local MediaPipe + CNN models...")
    return analyze_cpr_image_local(image_bytes)

def analyze_cpr_image_local(image_bytes: bytes) -> Dict[str, Any]:
    """
    Analyze CPR technique from image using local MediaPipe and CNN models
    (Original implementation, now used as fallback)
    """
    try:
        # Convert bytes to opencv image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Invalid image"}
        
        # Convert BGR to RGB for mediapipe
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        results = {
            "pose_detected": False,
            "arm_angle": 0,
            "depth": 0,
            "hand_x": 0.5,
            "hand_y": 0.5,
            "quality": 0,
            "phase": 0
        }
        
        # ===== MEDIAPIPE ANALYSIS (for accurate arm angles) =====
        if pose_detector:
            pose_results = pose_detector.process(img_rgb)
            
            if pose_results.pose_landmarks:
                results["pose_detected"] = True
                landmarks = pose_results.pose_landmarks.landmark
                h, w = img.shape[:2]
                
                # Calculate arm angle
                left_shoulder = np.array([
                    landmarks[11].x * w, 
                    landmarks[11].y * h, 
                    landmarks[11].z * w
                ])
                left_elbow = np.array([
                    landmarks[13].x * w, 
                    landmarks[13].y * h, 
                    landmarks[13].z * w
                ])
                left_wrist = np.array([
                    landmarks[15].x * w, 
                    landmarks[15].y * h, 
                    landmarks[15].z * w
                ])
                
                arm_angle = get_angle(left_shoulder, left_elbow, left_wrist)
                results["arm_angle"] = arm_angle
                
                # Get hand position
                wrist_x = (landmarks[15].x + landmarks[16].x) / 2
                wrist_y = (landmarks[15].y + landmarks[16].y) / 2
                results["hand_x"] = wrist_x
                results["hand_y"] = wrist_y
        
        # ===== CNN MODEL ANALYSIS (for depth and quality) =====
        if cnn_model:
            # Resize for CNN
            img_224 = cv2.resize(img, (224, 224))
            img_224 = img_224.astype(np.float32) / 255.0
            img_224 = np.expand_dims(img_224, axis=0)
            
            # Get predictions
            predictions = cnn_model.predict(img_224, verbose=0)[0]
            
            # Use only the good predictions
            results["depth"] = float(predictions[1])  # compression depth - MAE 0.19
            results["hand_offset_x"] = float(predictions[3])  # MAE 0.19
            results["hand_offset_y"] = float(predictions[4])  # MAE 0.26
            results["phase"] = float(predictions[7])  # compression phase
            results["quality"] = float(predictions[8])  # overall quality - MAE 0.04
            
            # Don't use predictions[0] (arm angle) or predictions[5] (torso lean) - they suck
        
        results["analysis_source"] = "local_models"
        return results
        
    except Exception as e:
        logger.error(f"Error analyzing image: {e}")
        return {"error": str(e), "analysis_source": "error"}

def generate_guidance(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate CPR guidance based on analysis results
    Handles both Replicate detailed analysis and traditional numeric analysis
    """
    
    # Check if this is a Replicate analysis with detailed feedback
    if analysis.get("analysis_source") == "replicate" and "replicate_analysis" in analysis:
        return generate_replicate_guidance(analysis)
    
    # Traditional guidance generation for numeric analysis
    feedback = []
    priority = "normal"
    
    # Check arm angle (from MediaPipe - accurate)
    if analysis.get("pose_detected"):
        arm_angle = analysis.get("arm_angle", 0)
        if arm_angle < 150:
            feedback.append("STRAIGHTEN YOUR ARMS")
            priority = "critical"
        elif arm_angle < 160:
            feedback.append("Arms need to be straighter")
            priority = "warning"
    
    # Check depth (from CNN - accurate)
    depth = analysis.get("depth", 0)
    if depth > 0:
        if depth < 1.8:
            feedback.append("PRESS DEEPER - at least 2 inches")
            priority = "critical"
        elif depth < 2.0:
            feedback.append("Press a bit deeper")
            if priority == "normal":
                priority = "warning"
        elif depth > 2.4:
            feedback.append("Too deep - ease up")
            if priority == "normal":
                priority = "warning"
    
    # Check hand position
    hand_x = analysis.get("hand_x", 0.5)
    if abs(hand_x - 0.5) > 0.15:
        feedback.append("CENTER YOUR HANDS on the chest")
        if priority == "normal":
            priority = "warning"
    
    # Overall quality
    quality = analysis.get("quality", 0)
    quality_percent = quality * 100
    
    # Determine main instruction
    if len(feedback) == 0:
        main_instruction = "Good CPR technique! Keep going!"
        priority = "good"
    else:
        main_instruction = feedback[0]  # Most important issue
    
    return {
        "instruction": main_instruction,
        "all_feedback": feedback,
        "priority": priority,
        "metrics": {
            "arm_angle": round(analysis.get("arm_angle", 0), 1),
            "depth_inches": round(analysis.get("depth", 0), 2),
            "quality_percent": round(quality_percent, 1),
            "hands_centered": abs(hand_x - 0.5) < 0.1,
            "compression_phase": "down" if analysis.get("phase", 0) > 0.5 else "up"
        }
    }

async def generate_cpr_summary(session_id: str, analysis_data: Dict[str, Any]) -> str:
    """
    Generate AI-powered summary of CPR session using OpenAI
    """
    try:
        if not OPENAI_API_KEY:
            return "OpenAI API key not configured. Summary generation unavailable."
        
        # Extract key metrics from analysis data
        total_corrections = analysis_data.get("totalCorrections", 0)
        critical_errors = analysis_data.get("criticalErrors", 0)
        performance_score = analysis_data.get("performanceScore", 0)
        corrections = analysis_data.get("corrections", [])
        duration_minutes = analysis_data.get("durationMinutes", 0)
        compression_count = analysis_data.get("totalCompressions", 0)
        
        # Build prompt with session data
        prompt = f"""
        You are an expert CPR instructor analyzing a training session. Please provide a comprehensive summary based on the following data:

        Session ID: {session_id}
        Duration: {duration_minutes} minutes
        Total Compressions: {compression_count}
        Performance Score: {performance_score}/100
        Total Corrections: {total_corrections}
        Critical Errors: {critical_errors}

        Correction Details:
        {json.dumps(corrections, indent=2) if corrections else "None"}

        Please provide:
        1. A brief overview of the session performance
        2. Specific areas that need improvement (if any)
        3. Strengths demonstrated
        4. Recommendations for the next training session

        Keep the tone professional and encouraging. Limit to 3-4 paragraphs.
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a CPR training expert providing feedback on training sessions."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"Error generating AI summary: {e}")
        return f"Error generating summary: {str(e)}. Please try again later."

# ============== API ENDPOINTS ==============

@app.get("/")
async def root():
    """Health check endpoint"""
    models_loaded = cnn_model is not None and pose_detector is not None
    return {
        "message": "Rescue CPR Backend is running",
        "status": "healthy",
        "models_loaded": models_loaded,
        "version": "2.0"
    }

@app.post("/analyze-hands")
async def analyze_hands(file: UploadFile = File(...)):
    """
    Analyze CPR technique from photo using real models
    """
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        logger.info(f"Received photo: {file.filename}, size: {len(image_data)} bytes")
        
        # Analyze with real models
        analysis = analyze_cpr_image(image_data)
        
        if "error" in analysis:
            raise HTTPException(status_code=500, detail=analysis["error"])
        
        # Generate guidance
        guidance = generate_guidance(analysis)
        
        response = {
            "success": True,
            "analysis": {
                "position": "good" if guidance["priority"] == "good" else guidance["priority"],
                "confidence": analysis.get("quality", 0)
            },
            "guidance": guidance["instruction"],
            "detailed_feedback": guidance["all_feedback"],
            "metrics": guidance["metrics"],
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Analysis complete: {response['guidance']}")
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
    Upload and store photo for QA purposes
    """
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Analyze the image
        analysis = analyze_cpr_image(image_data)
        guidance = generate_guidance(analysis)
        
        # Save photo with analysis results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        quality = analysis.get("quality", 0) * 100
        filename = f"cpr_{user_id or 'unknown'}_{timestamp}_q{quality:.0f}.jpg"
        filepath = os.path.join(PHOTOS_DIR, filename)
        
        with open(filepath, "wb") as f:
            f.write(image_data)
        
        # Save analysis results as json
        import json
        json_path = filepath.replace('.jpg', '_analysis.json')
        with open(json_path, 'w') as f:
            json.dump({
                "analysis": analysis,
                "guidance": guidance,
                "user_id": user_id,
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            }, f, indent=2)
        
        logger.info(f"Photo saved with analysis: {filepath}")
        
        return {
            "success": True,
            "message": "Photo uploaded and analyzed",
            "analysis": guidance,
            "file_path": filepath
        }
        
    except Exception as e:
        logger.error(f"Error uploading photo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading photo: {str(e)}")

@app.post("/generate-summary", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest):
    """
    Generate AI-powered summary of CPR session using OpenAI
    """
    try:
        summary = await generate_cpr_summary(request.sessionId, request.analysisData)
        
        return SummaryResponse(summary=summary)
        
    except Exception as e:
        logger.error(f"Error in generate-summary endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")

@app.get("/health")
async def health_check():
    """Detailed health check"""
    models_status = {
        "cnn_model": "loaded" if cnn_model else "not loaded",
        "mediapipe": "loaded" if pose_detector else "not loaded"
    }
    
    return {
        "status": "healthy",
        "service": "rescue-cpr-backend",
        "version": "2.0.0",
        "models": models_status,
        "endpoints": [
            "/",
            "/analyze-hands",
            "/upload-photo",
            "/health"
        ],
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
