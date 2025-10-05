#!/usr/bin/env python3
"""
Test the TFLite backend with images from the augmented dataset
"""

import os
import glob
import random
import requests
from PIL import Image
import io
import json
import time

def test_backend():
    # Configuration
    BACKEND_URL = "http://localhost:8000"
    DATASET_PATH = "/Users/elcruzo/Desktop/Rescue/Rescue/backend/ml/augmented_dataset"
    
    print("="*60)
    print("Testing CPR TFLite Backend with Augmented Dataset")
    print("="*60)
    
    # Check backend is running
    try:
        response = requests.get(BACKEND_URL)
        if response.status_code == 200:
            status = response.json()
            print(f"✅ Backend running at {BACKEND_URL}")
            print(f"   TFLite model: {status.get('tflite_model', 'unknown')}")
            print(f"   MediaPipe: {status.get('mediapipe', 'unknown')}")
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return
    except requests.ConnectionError:
        print(f"❌ Cannot connect to backend at {BACKEND_URL}")
        print("   Please start the backend first with: python main.py")
        return
    
    # Get test images
    image_files = glob.glob(os.path.join(DATASET_PATH, "*.jpg"))
    
    if not image_files:
        print(f"❌ No images found in {DATASET_PATH}")
        return
    
    print(f"\n✅ Found {len(image_files)} images in dataset")
    
    # Randomly select 5 images for testing
    test_images = random.sample(image_files, min(5, len(image_files)))
    
    print(f"📷 Testing with {len(test_images)} random images\n")
    print("-"*60)
    
    results = []
    
    for i, img_path in enumerate(test_images, 1):
        img_name = os.path.basename(img_path)
        print(f"\nTest {i}/{len(test_images)}: {img_name[:50]}...")
        
        try:
            # Load and prepare image
            with Image.open(img_path) as img:
                # Ensure RGB
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                print(f"  Image size: {img.size}, mode: {img.mode}")
                
                # Convert to bytes for upload
                img_bytes = io.BytesIO()
                img.save(img_bytes, format='JPEG', quality=95)
                img_bytes.seek(0)
                
                # Send to backend
                files = {'file': (img_name, img_bytes, 'image/jpeg')}
                
                start = time.time()
                response = requests.post(f"{BACKEND_URL}/analyze-pose", files=files)
                elapsed = time.time() - start
                
                if response.status_code == 200:
                    result = response.json()
                    results.append(result)
                    
                    print(f"  ✅ Analysis completed in {elapsed:.3f}s")
                    print(f"  Analysis source: {result.get('analysis_source', 'unknown')}")
                    
                    # Display key metrics if from TFLite
                    if result.get('tflite_used'):
                        print("\n  📊 CPR Metrics (from TFLite model):")
                        print(f"    • Arm angle: {result.get('arm_angle_degrees', 0):.1f}°")
                        print(f"    • Compression depth: {result.get('compression_depth_inches', 0):.1f}\"")
                        print(f"    • Compression rate: {result.get('compression_rate_bpm', 0):.0f} bpm")
                        print(f"    • Hand position X: {result.get('hand_x_offset_inches', 0):.1f}\"")
                        print(f"    • Hand position Y: {result.get('hand_y_offset_inches', 0):.1f}\"")
                        print(f"    • Quality score: {result.get('overall_quality_score', 0)*100:.1f}%")
                        print(f"    • Compression phase: {result.get('compression_phase', 0):.2f}")
                        print(f"    • Metronome BPM: {result.get('metronome_bpm', 0):.0f}")
                    
                    # Display pose detection info
                    if 'pose_detected' in result:
                        print(f"\n  🦴 Pose detected: {result['pose_detected']}")
                    
                    # Display feedback
                    if result.get('feedback'):
                        print("\n  💡 Feedback:")
                        for feedback in result['feedback'][:3]:
                            print(f"    • {feedback}")
                    
                else:
                    print(f"  ❌ Error: HTTP {response.status_code}")
                    print(f"     {response.text[:200]}")
                    
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    if results:
        # Calculate averages for TFLite results
        tflite_results = [r for r in results if r.get('tflite_used')]
        
        if tflite_results:
            print(f"\n📊 Average metrics from {len(tflite_results)} TFLite analyses:")
            
            metrics = {
                'arm_angle_degrees': 'Arm angle',
                'compression_depth_inches': 'Compression depth',
                'compression_rate_bpm': 'Compression rate',
                'overall_quality_score': 'Quality score'
            }
            
            for key, name in metrics.items():
                values = [r.get(key, 0) for r in tflite_results if key in r]
                if values:
                    avg = sum(values) / len(values)
                    if key == 'overall_quality_score':
                        print(f"  • {name}: {avg*100:.1f}%")
                    elif 'bpm' in key:
                        print(f"  • {name}: {avg:.0f} bpm")
                    elif 'inches' in key:
                        print(f"  • {name}: {avg:.2f} inches")
                    else:
                        print(f"  • {name}: {avg:.1f}°")
        
        # Count pose detections
        poses_detected = sum(1 for r in results if r.get('pose_detected'))
        print(f"\n🦴 Poses detected: {poses_detected}/{len(results)}")
        
        # Analysis sources
        sources = {}
        for r in results:
            source = r.get('analysis_source', 'unknown')
            sources[source] = sources.get(source, 0) + 1
        
        print(f"\n📍 Analysis sources:")
        for source, count in sources.items():
            print(f"  • {source}: {count}")
    
    print("\n✅ Testing complete!")

if __name__ == "__main__":
    test_backend()