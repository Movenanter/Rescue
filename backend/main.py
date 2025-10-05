from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import base64
import io
import os
import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime
from PIL import Image
from pydantic import BaseModel
import openai
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

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

# Prefer a TensorFlow Lite model if present; fall back to Keras
MODEL_TFLITE_PATH = "./cpr_model.tflite"
MODEL_KERAS_PATH = "./cpr_model.keras"
cnn_model = None
mp_pose = None
pose_detector = None

class TFLitePredictor:
    """Wrapper to mimic Keras .predict() using tf.lite.Interpreter."""
    def __init__(self, model_path: str):
        self.interpreter = tf.lite.Interpreter(model_path=model_path)
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()
        # Assume single input/output
        self.input_index = self.input_details[0]["index"]
        self.output_index = self.output_details[0]["index"]
        self.input_dtype = self.input_details[0]["dtype"]
        # (scale, zero_point) for quantized models; may be (0.0, 0)
        self.quant_params = self.input_details[0].get("quantization", (0.0, 0))

    def predict(self, x: np.ndarray, verbose: int = 0) -> np.ndarray:
        # x is expected to be batched: (N,H,W,C) float32 in [0,1]
        arr = x
        if self.input_dtype == np.uint8:
            scale, zero_point = self.quant_params
            if scale and scale > 0:
                arr = np.clip(np.round(arr / scale + zero_point), 0, 255).astype(np.uint8)
            else:
                arr = arr.astype(np.uint8)
        else:
            arr = arr.astype(np.float32)
        # Ensure input shape matches; avoid realloc if already correct
        if tuple(self.input_details[0]["shape"]) != tuple(arr.shape):
            self.interpreter.resize_tensor_input(self.input_index, arr.shape, strict=False)
            self.interpreter.allocate_tensors()
        self.interpreter.set_tensor(self.input_index, arr)
        self.interpreter.invoke()
        out = self.interpreter.get_tensor(self.output_index)
        return out

try:
    # Load ML model
    if os.path.exists(MODEL_TFLITE_PATH):
        cnn_model = TFLitePredictor(MODEL_TFLITE_PATH)
        logger.info(f"Loaded TFLite model from {MODEL_TFLITE_PATH}")
    elif os.path.exists(MODEL_KERAS_PATH):
        cnn_model = tf.keras.models.load_model(MODEL_KERAS_PATH)
        logger.info(f"Loaded Keras model from {MODEL_KERAS_PATH}")
    else:
        logger.warning("No model file found (cpr_model.tflite or cpr_model.keras). CNN features will be disabled.")
    
    # Initialize MediaPipe
    mp_pose = mp.solutions.pose
    pose_detector = mp_pose.Pose(
        static_image_mode=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    logger.info("MediaPipe initialized")
except Exception as e:
    logger.error(f"Error loading models: {e}")

def get_angle(p1, p2, p3):
    """Calculate angle between three points"""
    v1 = p1 - p2
    v2 = p3 - p2
    cos = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
    return np.degrees(np.arccos(np.clip(cos, -1, 1)))

def analyze_cpr_image(image_bytes: bytes) -> Dict[str, Any]:
    """
    Analyze CPR technique from image using both MediaPipe and CNN
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
        
        return results
        
    except Exception as e:
        logger.error(f"Error analyzing image: {e}")
        return {"error": str(e)}

def generate_guidance(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate CPR guidance based on analysis results
    """
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
    user_id: str = Form(None),
    session_id: str = Form(None),
    timestamp: str = Form(None),
    mentra_analysis: str = Form(None),
    mentra_guidance: str = Form(None)
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
        
        # Use Mentra glasses analysis if available, otherwise do backend analysis
        if mentra_analysis and mentra_guidance:
            # Parse Mentra analysis
            import json
            mentra_data = json.loads(mentra_analysis)
            
            # Create analysis structure compatible with our system
            analysis = {
                "position": mentra_data.get("position", "unknown"),
                "confidence": mentra_data.get("confidence", 0),
                "source": "mentra_glasses"
            }
            
            guidance = {
                "instruction": mentra_guidance,
                "all_feedback": [mentra_guidance],
                "priority": "good" if mentra_data.get("position") == "good" else "warning",
                "metrics": {
                    "quality_percent": mentra_data.get("confidence", 0) * 100
                }
            }
        else:
            # Fallback to backend analysis
            analysis = analyze_cpr_image(image_data)
            guidance = generate_guidance(analysis)
            analysis["source"] = "backend"
        
        # Save photo with analysis results
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        quality = analysis.get("confidence", 0) * 100 if analysis.get("source") == "mentra_glasses" else analysis.get("quality", 0) * 100
        filename = f"cpr_{user_id or 'unknown'}_{timestamp_str}_q{quality:.0f}.jpg"
        filepath = os.path.join(PHOTOS_DIR, filename)
        
        with open(filepath, "wb") as f:
            f.write(image_data)
        
        # Save analysis results as json
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

@app.get("/photos/{filename}")
async def get_photo(filename: str):
    """Serve photo files"""
    try:
        filepath = os.path.join(PHOTOS_DIR, filename)
        if os.path.exists(filepath):
            return FileResponse(filepath)
        else:
            raise HTTPException(status_code=404, detail="Photo not found")
    except Exception as e:
        logger.error(f"Error serving photo {filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Error serving photo: {str(e)}")

@app.get("/recent-photos")
async def get_recent_photos(limit: int = 10):
    """Get recent photos with analysis"""
    try:
        import glob
        import json
        
        # Get all analysis JSON files
        json_files = glob.glob(os.path.join(PHOTOS_DIR, "*_analysis.json"))
        
        # Sort by modification time (newest first)
        json_files.sort(key=os.path.getmtime, reverse=True)
        
        photos = []
        for json_file in json_files[:limit]:
            try:
                with open(json_file, 'r') as f:
                    analysis_data = json.load(f)
                
                # Get corresponding image file
                image_file = json_file.replace('_analysis.json', '.jpg')
                if os.path.exists(image_file):
                    photos.append({
                        "filename": os.path.basename(image_file),
                        "timestamp": analysis_data.get("timestamp"),
                        "user_id": analysis_data.get("user_id"),
                        "session_id": analysis_data.get("session_id"),
                        "analysis": analysis_data.get("analysis"),
                        "guidance": analysis_data.get("guidance")
                    })
            except Exception as e:
                logger.error(f"Error reading {json_file}: {e}")
                continue
        
        return {
            "success": True,
            "photos": photos,
            "count": len(photos)
        }
        
    except Exception as e:
        logger.error(f"Error getting recent photos: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting recent photos: {str(e)}")

@app.get("/sessions")
async def get_sessions():
    """Get all sessions with their photos grouped together"""
    try:
        import glob
        import json
        from collections import defaultdict
        
        # Get all analysis JSON files
        json_files = glob.glob(os.path.join(PHOTOS_DIR, "*_analysis.json"))
        
        # Group photos by session_id
        sessions_dict = defaultdict(lambda: {
            "session_id": None,
            "user_id": None,
            "start_time": None,
            "end_time": None,
            "photos": [],
            "total_photos": 0,
            "good_positions": 0,
            "poor_positions": 0,
            "no_cpr_detected": 0,
            "average_confidence": 0
        })
        
        # Process each photo
        for json_file in json_files:
            try:
                with open(json_file, 'r') as f:
                    analysis_data = json.load(f)
                
                session_id = analysis_data.get("session_id", "unknown")
                user_id = analysis_data.get("user_id", "unknown")
                timestamp = analysis_data.get("timestamp")
                analysis = analysis_data.get("analysis", {})
                guidance = analysis_data.get("guidance", "")
                
                # Get corresponding image file
                image_file = json_file.replace('_analysis.json', '.jpg')
                if os.path.exists(image_file):
                    photo_data = {
                        "filename": os.path.basename(image_file),
                        "timestamp": timestamp,
                        "analysis": analysis,
                        "guidance": guidance
                    }
                    
                    # Initialize session data
                    if sessions_dict[session_id]["session_id"] is None:
                        sessions_dict[session_id]["session_id"] = session_id
                        sessions_dict[session_id]["user_id"] = user_id
                        sessions_dict[session_id]["start_time"] = timestamp
                        sessions_dict[session_id]["end_time"] = timestamp
                    
                    # Add photo to session
                    sessions_dict[session_id]["photos"].append(photo_data)
                    sessions_dict[session_id]["total_photos"] += 1
                    
                    # Update timing
                    if timestamp:
                        if not sessions_dict[session_id]["start_time"] or timestamp < sessions_dict[session_id]["start_time"]:
                            sessions_dict[session_id]["start_time"] = timestamp
                        if not sessions_dict[session_id]["end_time"] or timestamp > sessions_dict[session_id]["end_time"]:
                            sessions_dict[session_id]["end_time"] = timestamp
                    
                    # Count position types
                    position = analysis.get("position", "uncertain")
                    confidence = analysis.get("confidence", 0)
                    
                    if position == "good":
                        sessions_dict[session_id]["good_positions"] += 1
                    elif position in ["high", "low", "left", "right", "uncertain", "unknown"]:
                        sessions_dict[session_id]["poor_positions"] += 1
                    elif position == "no_cpr":
                        sessions_dict[session_id]["no_cpr_detected"] += 1
                    
                    # Update average confidence
                    current_avg = sessions_dict[session_id]["average_confidence"]
                    total_photos = sessions_dict[session_id]["total_photos"]
                    sessions_dict[session_id]["average_confidence"] = ((current_avg * (total_photos - 1)) + confidence) / total_photos
                    
            except Exception as e:
                logger.error(f"Error reading {json_file}: {e}")
                continue
        
        # Convert to list and sort by start_time (newest first)
        sessions = list(sessions_dict.values())
        sessions.sort(key=lambda x: x["start_time"] or "", reverse=True)
        
        # Sort photos within each session by timestamp (newest first)
        for session in sessions:
            session["photos"].sort(key=lambda x: x["timestamp"] or "", reverse=True)
        
        return {
            "success": True,
            "sessions": sessions,
            "count": len(sessions)
        }
        
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting sessions: {str(e)}")

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
            "/recent-photos",
            "/sessions",
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
