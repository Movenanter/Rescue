from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import cv2
import numpy as np
import tensorflow as tf
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime
from PIL import Image
from pydantic import BaseModel
import json
import uuid
import base64
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import mediapipe for pose detection
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    logger.warning("MediaPipe not available - pose detection features limited")
    MEDIAPIPE_AVAILABLE = False
    mp = None

# Create directories for data storage
PHOTOS_DIR = "backend_photos"
SESSIONS_DIR = "sessions"
os.makedirs(PHOTOS_DIR, exist_ok=True)
os.makedirs(SESSIONS_DIR, exist_ok=True)

app = FastAPI(title="Rescue CPR Backend", version="3.0.0")

# Pydantic models for API requests/responses
class SessionData(BaseModel):
    session_id: str
    device_id: str
    timestamp: str
    metrics: Dict[str, Any]
    photos: List[str] = []
    
class AnalysisRequest(BaseModel):
    session_id: str
    device_id: str

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TFLite model configuration
TFLITE_MODEL_PATH = "./ml/cpr_model.tflite"
tflite_interpreter = None
tflite_input_details = None
tflite_output_details = None
pose_detector = None

# Session storage (in-memory for now, can be replaced with Redis later)
active_sessions = {}

# Gemini configuration for fallback
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-1.5-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

if GEMINI_API_KEY:
    logger.info("✓ Gemini API key found - fallback analysis available")
else:
    logger.info("No Gemini API key - using TFLite only")

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

def analyze_with_gemini(image_bytes: bytes) -> Optional[Dict[str, Any]]:
    """
    Use Gemini Vision as fallback for CPR analysis when TFLite fails
    """
    if not GEMINI_API_KEY:
        return None
        
    try:
        # Encode image to base64
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        # Prepare the prompt for CPR analysis
        prompt = """Analyze this CPR compression technique image. Focus on:
1. Arm angle (should be 170-180 degrees, straight)
2. Hand position (centered on chest)
3. Body posture
4. Overall technique quality

Provide your analysis in this exact JSON format:
{
  "arm_angle_degrees": <number between 0-180>,
  "hand_position": "good" or "needs_adjustment" or "left" or "right" or "high" or "low",
  "compression_depth_estimate": <number between 0-5 inches>,
  "overall_quality_score": <number between 0-1>,
  "feedback": ["specific feedback item 1", "specific feedback item 2"],
  "critical_issues": true or false
}

Be strict about arm angle - anything below 160 degrees needs correction."""
        
        # Prepare request body
        request_body = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64_image
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "topK": 32,
                "topP": 1,
                "maxOutputTokens": 1024
            }
        }
        
        # Make request to Gemini
        headers = {"Content-Type": "application/json"}
        url = f"{GEMINI_ENDPOINT}?key={GEMINI_API_KEY}"
        response = requests.post(url, json=request_body, headers=headers, timeout=10)
        
        if response.status_code != 200:
            logger.error(f"Gemini API error: {response.status_code} - {response.text}")
            return None
            
        # Parse response
        result = response.json()
        content = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        
        # Extract JSON from response
        import re
        json_match = re.search(r'\{[^}]+\}', content, re.DOTALL)
        if json_match:
            analysis = json.loads(json_match.group())
            
            # Convert to our expected format
            return {
                "analysis_source": "gemini_vision",
                "arm_angle_degrees": analysis.get("arm_angle_degrees", 180),
                "compression_depth_inches": analysis.get("compression_depth_estimate", 2.0),
                "overall_quality_score": analysis.get("overall_quality_score", 0.5),
                "hand_position": analysis.get("hand_position", "uncertain"),
                "feedback": analysis.get("feedback", []),
                "critical_issues": analysis.get("critical_issues", False),
                "gemini_used": True
            }
        
        return None
        
    except Exception as e:
        logger.error(f"Gemini fallback error: {e}")
        return None

def create_session(device_id: str) -> str:
    """Create a new CPR session"""
    session_id = str(uuid.uuid4())
    session_data = {
        "session_id": session_id,
        "device_id": device_id,
        "start_time": datetime.now().isoformat(),
        "photos": [],
        "compressions": 0,
        "metrics": []
    }
    active_sessions[session_id] = session_data
    
    # Save to file
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    with open(session_file, 'w') as f:
        json.dump(session_data, f)
    
    return session_id

def analyze_cpr_image(image_bytes: bytes) -> Dict[str, Any]:
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
                
                # Try Gemini as fallback
                logger.info("TFLite failed, trying Gemini fallback...")
                gemini_result = analyze_with_gemini(image_bytes)
                if gemini_result:
                    logger.info("Gemini fallback successful")
                    result.update(gemini_result)
                    result["feedback"] = gemini_result.get("feedback", [])
                else:
                    logger.warning("Both TFLite and Gemini failed")
        else:
            # No TFLite model, try Gemini
            logger.info("No TFLite model, trying Gemini...")
            gemini_result = analyze_with_gemini(image_bytes)
            if gemini_result:
                result.update(gemini_result)
            else:
                result["message"] = "No analysis models available"
        
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
        "service": "Rescue CPR Backend",
        "version": "3.0.0",
        "status": "running",
        "tflite_model": "loaded" if tflite_interpreter else "not loaded",
        "mediapipe": "initialized" if pose_detector else "not available",
        "active_sessions": len(active_sessions)
    }

@app.post("/start-session")
async def start_session(device_id: str = "default"):
    """Start a new CPR session"""
    session_id = create_session(device_id)
    return {"session_id": session_id, "device_id": device_id}

@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get session data"""
    if session_id in active_sessions:
        return active_sessions[session_id]
    
    # Try loading from file
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if os.path.exists(session_file):
        with open(session_file, 'r') as f:
            return json.load(f)
    
    raise HTTPException(status_code=404, detail="Session not found")

@app.get("/sessions")
async def list_sessions():
    """List all sessions"""
    sessions = []
    for filename in os.listdir(SESSIONS_DIR):
        if filename.endswith('.json'):
            session_file = os.path.join(SESSIONS_DIR, filename)
            with open(session_file, 'r') as f:
                sessions.append(json.load(f))
    return sessions

@app.post("/analyze-pose")
async def analyze_pose(file: UploadFile = File(...), session_id: Optional[str] = None):
    """
    Analyze CPR pose from uploaded image using TFLite
    """
    try:
        # Read image
        image_bytes = await file.read()
        
        # Analyze with TFLite
        result = analyze_cpr_image(image_bytes)
        
        # Update session if provided
        if session_id and session_id in active_sessions:
            active_sessions[session_id]["metrics"].append(result)
            # Save to file
            session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
            with open(session_file, 'w') as f:
                json.dump(active_sessions[session_id], f)
        
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
        analysis = analyze_cpr_image(content)
        
        return JSONResponse(content={
            "message": "Photo saved successfully",
            "filename": filename,
            "analysis": analysis
        })
        
    except Exception as e:
        logger.error(f"Error saving photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-hands")
async def analyze_hands(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    compression_count: Optional[int] = Form(None)
):
    """
    Analyze hand position for CPR - endpoint expected by Mentra glasses
    """
    try:
        # Read image
        image_bytes = await file.read()
        
        # Analyze with TFLite
        result = analyze_cpr_image(image_bytes)
        
        # Map to Mentra expected format
        hand_position = "good"
        priority = "good"
        guidance = "Position good, continue."
        
        # Determine hand position based on metrics
        if result.get("tflite_used"):
            arm_angle = result.get("arm_angle_degrees", 180)
            hand_x = result.get("hand_x_offset_inches", 0)
            hand_y = result.get("hand_y_offset_inches", 0)
            quality = result.get("overall_quality_score", 0.5)
            
            if arm_angle < 160:
                hand_position = "needs_adjustment"
                priority = "critical" if arm_angle < 150 else "warning"
                guidance = f"Straighten arms more (current: {arm_angle:.0f}°, target: 170-180°)"
            elif abs(hand_x) > 2:
                hand_position = "left" if hand_x < 0 else "right"
                priority = "warning"
                guidance = f"Center hands on chest (offset: {abs(hand_x):.1f} inches)"
            elif abs(hand_y) > 2:
                hand_position = "high" if hand_y < 0 else "low"
                priority = "warning" 
                guidance = f"Adjust hand position {'higher' if hand_y > 0 else 'lower'}"
            elif quality < 0.6:
                hand_position = "needs_adjustment"
                priority = "warning"
                guidance = "Improve compression technique"
        
        # Update session if provided
        if session_id and session_id in active_sessions:
            active_sessions[session_id]["compressions"] = compression_count or 0
            active_sessions[session_id]["metrics"].append({
                "compression_count": compression_count,
                "hand_position": hand_position,
                "metrics": result
            })
        
        return JSONResponse(content={
            "analysis": {
                "position": hand_position,
                "confidence": result.get("overall_quality_score", 0.7)
            },
            "guidance": guidance,
            "priority": priority,
            "metrics": result
        })
        
    except Exception as e:
        logger.error(f"Error in analyze_hands: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    timestamp: Optional[str] = Form(None)
):
    """
    Upload photo endpoint expected by Mentra glasses
    """
    try:
        # Generate filename
        ts = timestamp or datetime.now().strftime("%Y%m%d_%H%M%S")
        user = user_id or "unknown"
        filename = f"upload_{user}_{ts}.jpg"
        filepath = os.path.join(PHOTOS_DIR, filename)
        
        # Save file
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        
        logger.info(f"Photo uploaded: {filename}")
        
        return JSONResponse(content={
            "success": True,
            "filename": filename,
            "message": "Photo uploaded successfully"
        })
        
    except Exception as e:
        logger.error(f"Error uploading photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "tflite_loaded": tflite_interpreter is not None,
        "mediapipe_available": MEDIAPIPE_AVAILABLE
    }

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