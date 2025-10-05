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
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    logger.warning("MediaPipe not available - pose detection features limited")
    MEDIAPIPE_AVAILABLE = False
    mp = None

from datetime import datetime
from PIL import Image
from pydantic import BaseModel
import json

# Try to import optional services
try:
    from replicate_service import (
        analyze_with_replicate,
        convert_replicate_to_standard_format
    )
    REPLICATE_AVAILABLE = True
except ImportError:
    logger.warning("Replicate service not available")
    REPLICATE_AVAILABLE = False

# Try to import OpenAI
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    logger.warning("OpenAI not available - AI summaries disabled")
    OPENAI_AVAILABLE = False

# Environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:5000")
ML_SERVICE_TIMEOUT = int(os.getenv("ML_SERVICE_TIMEOUT", "30"))
USE_ML_SERVICE = os.getenv("USE_ML_SERVICE", "true").lower() == "true"

# Initialize OpenAI client if API key is provided
if OPENAI_AVAILABLE and OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY
else:
    logger.warning("OpenAI API not configured - AI summaries will be disabled")

# Create photos directory
PHOTOS_DIR = "backend_photos"
os.makedirs(PHOTOS_DIR, exist_ok=True)

app = FastAPI(title="Rescue CPR Backend (TFLite)", version="2.0.0")

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

# TFLite model configuration
TFLITE_MODEL_PATH = "./ml/cpr_model.tflite"  # adjust path as needed
tflite_interpreter = None
tflite_input_details = None
tflite_output_details = None
pose_detector = None

# HTTP client for ML service
ml_client = None
if USE_ML_SERVICE:
    try:
        ml_client = httpx.AsyncClient(
            base_url=ML_SERVICE_URL,
            timeout=ML_SERVICE_TIMEOUT
        )
    except Exception as e:
        logger.warning(f"Could not initialize ML service client: {e}")

# Load TFLite model
try:
    if os.path.exists(TFLITE_MODEL_PATH):
        # Load TFLite model
        tflite_interpreter = tf.lite.Interpreter(model_path=TFLITE_MODEL_PATH)
        tflite_interpreter.allocate_tensors()
        
        # Get input and output details
        tflite_input_details = tflite_interpreter.get_input_details()
        tflite_output_details = tflite_interpreter.get_output_details()
        
        logger.info(f"✓ Successfully loaded TFLite model from {TFLITE_MODEL_PATH}")
        logger.info(f"  Input shape: {tflite_input_details[0]['shape']}")
        logger.info(f"  Output shape: {tflite_output_details[0]['shape']}")
    else:
        logger.warning(f"TFLite model not found at {TFLITE_MODEL_PATH}")
        logger.warning("The backend will work but CNN predictions won't be available")
        logger.warning("Please ensure cpr_model.tflite is in the backend directory")
        tflite_interpreter = None
except Exception as e:
    logger.error(f"Error loading TFLite model: {e}")
    tflite_interpreter = None

# Initialize MediaPipe if available
try:
    if MEDIAPIPE_AVAILABLE and mp:
        mp_pose = mp.solutions.pose
        pose_detector = mp_pose.Pose(
            static_image_mode=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("✓ MediaPipe initialized")
except Exception as e:
    logger.error(f"Error initializing MediaPipe: {e}")
    pose_detector = None

def get_angle(p1, p2, p3):
    """Calculate angle between three points"""
    v1 = p1 - p2
    v2 = p3 - p2
    cos = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
    return np.degrees(np.arccos(np.clip(cos, -1, 1)))

def predict_with_tflite(image_array: np.ndarray) -> Optional[np.ndarray]:
    """
    Make prediction using TFLite model
    
    Args:
        image_array: Preprocessed image array of shape (1, 224, 224, 3)
        
    Returns:
        Model predictions array or None if prediction fails
    """
    if tflite_interpreter is None:
        return None
        
    try:
        # Ensure input is float32
        if image_array.dtype != np.float32:
            image_array = image_array.astype(np.float32)
            
        # Set the input tensor
        tflite_interpreter.set_tensor(tflite_input_details[0]['index'], image_array)
        
        # Run inference
        tflite_interpreter.invoke()
        
        # Get the output tensor
        output = tflite_interpreter.get_tensor(tflite_output_details[0]['index'])
        
        return output
    except Exception as e:
        logger.error(f"TFLite prediction error: {e}")
        return None

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

async def analyze_cpr_image(image_bytes: bytes) -> Dict[str, Any]:
    """
    Main analysis function with fallback chain:
    Priority: 1) Replicate, 2) ML Service, 3) Local TFLite
    """
    
    # Try Replicate first if available
    if REPLICATE_AVAILABLE:
        logger.info("Attempting analysis with Replicate vision model...")
        try:
            replicate_result = await analyze_with_replicate(image_bytes)
            if not replicate_result.get("error"):
                logger.info("Successfully analyzed with Replicate")
                standard_format = convert_replicate_to_standard_format(replicate_result)
                standard_format["analysis_source"] = "replicate"
                return standard_format
        except Exception as e:
            logger.warning(f"Replicate analysis failed: {e}")
    
    # Try ML service if configured
    if USE_ML_SERVICE and ml_client:
        logger.info("Attempting ML service analysis...")
        ml_result = await analyze_with_ml_service(image_bytes)
        if not ml_result.get("error"):
            ml_result["analysis_source"] = "ml_service"
            return ml_result
    
    # Fall back to local TFLite model
    logger.info("Using local TFLite model...")
    return analyze_cpr_image_local(image_bytes)

def analyze_cpr_image_local(image_bytes: bytes) -> Dict[str, Any]:
    """
    Analyze CPR technique using local TFLite model and optionally MediaPipe
    """
    try:
        # Convert bytes to opencv image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert to RGB
        img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
        
        # Initialize result
        result = {
            "pose_detected": False,
            "analysis_source": "local_tflite"
        }
        
        # Use MediaPipe for basic pose detection if available
        if pose_detector:
            mp_result = pose_detector.process(img_rgb)
            
            if mp_result.pose_landmarks:
                result["pose_detected"] = True
                landmarks = mp_result.pose_landmarks.landmark
                
                # Basic pose analysis
                left_shoulder = np.array([landmarks[11].x, landmarks[11].y])
                right_shoulder = np.array([landmarks[12].x, landmarks[12].y])
                left_elbow = np.array([landmarks[13].x, landmarks[13].y])
                right_elbow = np.array([landmarks[14].x, landmarks[14].y])
                left_wrist = np.array([landmarks[15].x, landmarks[15].y])
                right_wrist = np.array([landmarks[16].x, landmarks[16].y])
                
                # Calculate arm angle
                left_angle = get_angle(left_shoulder, left_elbow, left_wrist)
                right_angle = get_angle(right_shoulder, right_elbow, right_wrist)
                arm_angle = (left_angle + right_angle) / 2
                
                result["arm_angle"] = arm_angle
                result["pose_landmarks"] = True
        
        # Use TFLite model for detailed prediction if available
        if tflite_interpreter is not None:
            try:
                # Preprocess image for TFLite model
                img_pil = Image.fromarray(img_rgb)
                img_resized = img_pil.resize((224, 224), Image.Resampling.LANCZOS)
                img_array = np.array(img_resized, dtype=np.float32) / 255.0
                img_array = np.expand_dims(img_array, axis=0)
                
                # Run TFLite model prediction
                predictions = predict_with_tflite(img_array)
                
                if predictions is not None:
                    # Get the first (and only) prediction
                    predictions = predictions[0]
                    
                    # Map predictions to output names (normalized values 0-1)
                    output_names = [
                        "arm_angle_degrees",
                        "compression_depth_inches",
                        "compression_rate_bpm",
                        "hand_x_offset_inches",
                        "hand_y_offset_inches",
                        "torso_lean_degrees",
                        "hands_interlocked_score",
                        "compression_phase",
                        "overall_quality_score",
                        "metronome_bpm",
                        "metronome_volume",
                        "beat_alignment_score",
                        "next_beat_countdown"
                    ]
                    
                    # Denormalization ranges (matching the training)
                    denorm_ranges = {
                        "arm_angle_degrees": (0, 180),
                        "compression_depth_inches": (0, 5),
                        "compression_rate_bpm": (0, 200),
                        "hand_x_offset_inches": (-10, 10),
                        "hand_y_offset_inches": (-10, 10),
                        "torso_lean_degrees": (0, 90),
                        "hands_interlocked_score": (0, 1),
                        "compression_phase": (0, 1),
                        "overall_quality_score": (0, 1),
                        "metronome_bpm": (80, 140),
                        "metronome_volume": (0, 1),
                        "beat_alignment_score": (0, 1),
                        "next_beat_countdown": (0, 30)
                    }
                    
                    # Denormalize and store predictions
                    for i, name in enumerate(output_names[:len(predictions)]):
                        normalized_value = float(predictions[i])
                        if name in denorm_ranges:
                            min_val, max_val = denorm_ranges[name]
                            denormalized_value = normalized_value * (max_val - min_val) + min_val
                            result[name] = denormalized_value
                        else:
                            result[name] = normalized_value
                    
                    # Generate feedback based on predictions
                    feedback = []
                    
                    arm_angle = result.get("arm_angle_degrees", 0)
                    if arm_angle < 160:
                        feedback.append(f"Straighten arms more (current: {arm_angle:.0f}°)")
                    
                    depth = result.get("compression_depth_inches", 0)
                    if depth < 2.0:
                        feedback.append(f"Press deeper (current: {depth:.1f} inches, target: 2.0-2.4)")
                    elif depth > 2.4:
                        feedback.append(f"Reduce compression depth (current: {depth:.1f} inches, target: 2.0-2.4)")
                    
                    rate = result.get("compression_rate_bpm", 0)
                    if rate < 100:
                        feedback.append(f"Increase compression rate (current: {rate:.0f} bpm, target: 100-120)")
                    elif rate > 120:
                        feedback.append(f"Slow down compressions (current: {rate:.0f} bpm, target: 100-120)")
                    
                    result["feedback"] = feedback
                    result["quality_score"] = result.get("overall_quality_score", 0)
                    result["tflite_used"] = True
                    
                    logger.info("TFLite model prediction successful")
                    
            except Exception as e:
                logger.error(f"Error in TFLite prediction: {e}")
                result["tflite_error"] = str(e)
        else:
            result["message"] = "TFLite model not loaded - only basic analysis available"
        
        return result
        
    except Exception as e:
        logger.error(f"Error in local CPR analysis: {e}")
        return {
            "error": str(e),
            "pose_detected": False,
            "analysis_source": "local_error"
        }

@app.get("/")
async def root():
    """Root endpoint with service status"""
    return {
        "service": "Rescue CPR Backend (TFLite)",
        "version": "2.0.0",
        "status": "running",
        "model_type": "TFLite",
        "tflite_model": "loaded" if tflite_interpreter else "not loaded",
        "mediapipe": "initialized" if pose_detector else "not available",
        "ml_service": "configured" if USE_ML_SERVICE else "disabled",
        "replicate": "available" if REPLICATE_AVAILABLE else "not available",
        "openai": "configured" if (OPENAI_AVAILABLE and OPENAI_API_KEY) else "not configured",
    }

@app.post("/analyze-pose")
async def analyze_pose(file: UploadFile = File(...)):
    """
    Analyze CPR pose from uploaded image
    Uses fallback chain: Replicate → ML Service → Local TFLite
    """
    try:
        # Read image
        image_bytes = await file.read()
        
        # Analyze with fallback chain
        result = await analyze_cpr_image(image_bytes)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error in analyze_pose: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save-photo")
async def save_photo(file: UploadFile = File(...)):
    """Save photo for session recording"""
    try:
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
        filename = f"cpr_photo_{timestamp}.jpg"
        filepath = os.path.join(PHOTOS_DIR, filename)
        
        # Save file
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        
        logger.info(f"Photo saved: {filename}")
        
        # Also analyze the photo
        analysis = await analyze_cpr_image(content)
        
        return JSONResponse(content={
            "message": "Photo saved successfully",
            "filename": filename,
            "analysis": analysis
        })
        
    except Exception as e:
        logger.error(f"Error saving photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-summary")
async def generate_summary(request: SummaryRequest):
    """Generate AI summary of CPR session"""
    try:
        if not (OPENAI_AVAILABLE and OPENAI_API_KEY):
            return SummaryResponse(
                summary="AI summary not available. Your session showed good effort! Keep practicing to improve your CPR technique."
            )
        
        # Extract analysis data
        session_id = request.sessionId
        analysis_data = request.analysisData
        
        # Create prompt for GPT
        prompt = f"""
        Generate a brief, constructive summary of this CPR training session:
        
        Session ID: {session_id}
        
        Key Metrics:
        - Compression Depth: {analysis_data.get('avg_depth', 'N/A')} inches
        - Compression Rate: {analysis_data.get('avg_rate', 'N/A')} bpm
        - Arm Angle: {analysis_data.get('avg_arm_angle', 'N/A')} degrees
        - Overall Quality: {analysis_data.get('avg_quality', 0) * 100:.1f}%
        
        Total Compressions: {analysis_data.get('total_compressions', 0)}
        Duration: {analysis_data.get('duration_seconds', 0)} seconds
        
        Please provide:
        1. What was done well
        2. Main area for improvement
        3. One specific tip for next session
        
        Keep it encouraging and under 100 words.
        """
        
        # Call OpenAI
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful CPR training assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        summary = response.choices[0].message.content
        
        return SummaryResponse(summary=summary)
        
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        return SummaryResponse(
            summary="Good effort in this training session! Keep practicing to maintain and improve your CPR skills."
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model": "tflite"}

if __name__ == "__main__":
    # Run the server
    logger.info("Starting Rescue CPR Backend with TFLite model...")
    logger.info(f"Looking for TFLite model at: {TFLITE_MODEL_PATH}")
    
    uvicorn.run(
        "main:app",  # Changed from main_tflite:app
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )