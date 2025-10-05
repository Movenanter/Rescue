#!/usr/bin/env python3
"""
End-to-End Test Script for Rescue CPR System
Tests Backend, Frontend, and ML Model Integration
"""

import requests
import json
import time
import os
import base64
from datetime import datetime
from pathlib import Path

# Configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"
TEST_IMAGE_PATH = "/Users/elcruzo/Desktop/HH25/Rescue/backend/cpr_images_augmented_dataset_extracted"

# Color codes for output
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'
BLUE = '\033[94m'

def log(message, status="INFO"):
    """Print colored log messages"""
    colors = {"PASS": GREEN, "FAIL": RED, "INFO": BLUE, "WARN": YELLOW}
    color = colors.get(status, RESET)
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{color}[{timestamp}] [{status}] {message}{RESET}")

def test_backend_health():
    """Test backend health endpoint"""
    log("Testing backend health...")
    try:
        response = requests.get(f"{BACKEND_URL}/health")
        if response.status_code == 200:
            data = response.json()
            log(f"Backend healthy - TFLite: {data['tflite_loaded']}, MediaPipe: {data['mediapipe_available']}", "PASS")
            return True
        else:
            log(f"Backend unhealthy - Status: {response.status_code}", "FAIL")
            return False
    except Exception as e:
        log(f"Backend connection failed: {e}", "FAIL")
        return False

def test_frontend_connection():
    """Test frontend is accessible"""
    log("Testing frontend connection...")
    try:
        response = requests.get(FRONTEND_URL)
        if response.status_code == 200:
            log("Frontend accessible", "PASS")
            return True
        else:
            log(f"Frontend error - Status: {response.status_code}", "FAIL")
            return False
    except Exception as e:
        log(f"Frontend connection failed: {e}", "FAIL")
        return False

def test_analyze_pose():
    """Test the pose analysis endpoint with a CPR image"""
    log("Testing CPR pose analysis...")
    
    # Find a test image
    test_images = []
    if os.path.exists(TEST_IMAGE_PATH):
        for file in os.listdir(TEST_IMAGE_PATH):
            if file.lower().endswith(('.jpg', '.jpeg', '.png')) and 'cpr' in file.lower():
                test_images.append(os.path.join(TEST_IMAGE_PATH, file))
    
    if not test_images:
        log("No test images found", "WARN")
        return False
    
    # Test with first available image
    test_image = test_images[0]
    log(f"Using test image: {os.path.basename(test_image)}")
    
    try:
        with open(test_image, 'rb') as f:
            files = {'file': (os.path.basename(test_image), f, 'image/jpeg')}
            response = requests.post(f"{BACKEND_URL}/analyze-pose", files=files)
        
        if response.status_code == 200:
            data = response.json()
            log(f"Analysis successful - Position: {data.get('hand_position', 'unknown')}", "PASS")
            
            # Display metrics
            if 'metrics' in data:
                metrics = data['metrics']
                log(f"  Arm angle: {metrics.get('arm_angle', 'N/A')}°")
                log(f"  Compression depth: {metrics.get('compression_depth', 'N/A')} inches")
                log(f"  Quality score: {metrics.get('overall_quality', 'N/A')}")
            
            # Display feedback
            if 'feedback' in data:
                for fb in data['feedback'][:3]:  # Show first 3 feedback items
                    log(f"  Feedback: {fb}")
            
            return True
        else:
            log(f"Analysis failed - Status: {response.status_code}", "FAIL")
            return False
            
    except Exception as e:
        log(f"Pose analysis error: {e}", "FAIL")
        return False

def test_session_management():
    """Test session creation and management"""
    log("Testing session management...")
    
    try:
        # Create a new session
        session_data = {
            "user_id": "test_user_001",
            "session_type": "training"
        }
        response = requests.post(f"{BACKEND_URL}/session/start", json=session_data)
        
        if response.status_code == 200:
            data = response.json()
            session_id = data.get('session_id')
            log(f"Session created: {session_id}", "PASS")
            
            # Get session details
            response = requests.get(f"{BACKEND_URL}/session/{session_id}")
            if response.status_code == 200:
                session_info = response.json()
                log(f"Session retrieved - User: {session_info.get('user_id')}", "PASS")
                
                # End session
                response = requests.post(f"{BACKEND_URL}/session/{session_id}/end")
                if response.status_code == 200:
                    log("Session ended successfully", "PASS")
                    return True
            
        log("Session management failed", "FAIL")
        return False
        
    except Exception as e:
        log(f"Session management error: {e}", "FAIL")
        return False

def test_full_cpr_flow():
    """Test a complete CPR training flow"""
    log("Testing full CPR training flow...", "INFO")
    
    try:
        # Start session
        session_data = {"user_id": "test_flow_user", "session_type": "training"}
        response = requests.post(f"{BACKEND_URL}/session/start", json=session_data)
        session_id = response.json().get('session_id')
        log(f"Training session started: {session_id}")
        
        # Simulate multiple compressions with analysis
        test_images = []
        if os.path.exists(TEST_IMAGE_PATH):
            for file in os.listdir(TEST_IMAGE_PATH)[:5]:  # Test with up to 5 images
                if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                    test_images.append(os.path.join(TEST_IMAGE_PATH, file))
        
        compression_count = 0
        feedback_summary = {"good": 0, "warning": 0, "critical": 0}
        
        for idx, image_path in enumerate(test_images):
            log(f"  Compression {idx + 1}...")
            
            with open(image_path, 'rb') as f:
                files = {'file': (f'compression_{idx}.jpg', f, 'image/jpeg')}
                data = {'session_id': session_id}
                response = requests.post(f"{BACKEND_URL}/analyze-pose", files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                position = result.get('hand_position', 'unknown')
                
                # Count feedback types
                if position == 'good':
                    feedback_summary['good'] += 1
                elif position == 'needs_adjustment':
                    feedback_summary['warning'] += 1
                else:
                    feedback_summary['critical'] += 1
                
                compression_count += 1
                time.sleep(0.5)  # Simulate compression timing
        
        # End session
        response = requests.post(f"{BACKEND_URL}/session/{session_id}/end")
        
        # Display summary
        log(f"\nTraining Summary:", "INFO")
        log(f"  Total compressions analyzed: {compression_count}")
        log(f"  Good form: {feedback_summary['good']}")
        log(f"  Needs adjustment: {feedback_summary['warning']}")
        log(f"  Critical issues: {feedback_summary['critical']}")
        
        success_rate = (feedback_summary['good'] / compression_count * 100) if compression_count > 0 else 0
        log(f"  Success rate: {success_rate:.1f}%")
        
        return True
        
    except Exception as e:
        log(f"Full flow test error: {e}", "FAIL")
        return False

def test_mentra_translation_readiness():
    """Check if Mentra app with translation is ready"""
    log("Checking Mentra app translation readiness...", "INFO")
    
    # Check if translation module exists
    translation_path = Path("/Users/elcruzo/Desktop/HH25/Rescue/mentra/src/translation.ts")
    if translation_path.exists():
        log("Translation module found", "PASS")
    else:
        log("Translation module missing", "FAIL")
        return False
    
    # Check if build was successful
    dist_path = Path("/Users/elcruzo/Desktop/HH25/Rescue/mentra/dist")
    if dist_path.exists():
        log("Mentra app built successfully", "PASS")
        
        # Check for required files
        if (dist_path / "index.js").exists():
            log("  - Main app compiled", "PASS")
        if (dist_path / "translation.js").exists():
            log("  - Translation module compiled", "PASS")
    else:
        log("Mentra app not built", "WARN")
        return False
    
    # Check environment readiness
    log("\nEnvironment check for Mentra:")
    env_vars = {
        "MENTRAOS_API_KEY": "Required for glasses connection",
        "GEMINI_API_KEY": "Optional for advanced NLU",
        "ELEVENLABS_API_KEY": "Optional for natural voice translation"
    }
    
    for var, desc in env_vars.items():
        if os.environ.get(var):
            log(f"  ✓ {var} set - {desc}", "PASS")
        else:
            status = "WARN" if "Optional" in desc else "FAIL"
            log(f"  ✗ {var} not set - {desc}", status)
    
    return True

def main():
    """Run all tests"""
    print(f"\n{BLUE}{'='*60}")
    print(f"   RESCUE CPR SYSTEM - END-TO-END TEST SUITE")
    print(f"{'='*60}{RESET}\n")
    
    test_results = {
        "Backend Health": test_backend_health(),
        "Frontend Connection": test_frontend_connection(),
        "Pose Analysis": test_analyze_pose(),
        "Session Management": test_session_management(),
        "Full CPR Flow": test_full_cpr_flow(),
        "Mentra Translation": test_mentra_translation_readiness()
    }
    
    # Summary
    print(f"\n{BLUE}{'='*60}")
    print(f"   TEST SUMMARY")
    print(f"{'='*60}{RESET}\n")
    
    total = len(test_results)
    passed = sum(test_results.values())
    
    for test_name, result in test_results.items():
        status = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
        print(f"  {test_name:.<30} {status}")
    
    print(f"\n{BLUE}{'='*60}{RESET}")
    success_rate = (passed / total * 100) if total > 0 else 0
    
    if success_rate == 100:
        print(f"{GREEN}  ✓ ALL TESTS PASSED! ({passed}/{total}){RESET}")
    elif success_rate >= 80:
        print(f"{YELLOW}  ⚠ MOSTLY PASSING ({passed}/{total} - {success_rate:.0f}%){RESET}")
    else:
        print(f"{RED}  ✗ TESTS FAILING ({passed}/{total} - {success_rate:.0f}%){RESET}")
    
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    # Next steps
    print(f"{BLUE}NEXT STEPS:{RESET}")
    print("1. Deploy Mentra app to glasses: bun run start")
    print("2. Test voice commands: 'start translation', 'check hands'")
    print("3. Monitor real-time feedback in frontend dashboard")
    print("4. Review session summaries for training insights\n")

if __name__ == "__main__":
    main()