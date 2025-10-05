import os
import cv2
from pathlib import Path

#use this command to download the video and put it in a videos/ directory:
# yt-dlp -o "videos/%(title)s.%(ext)s" "VIDEO_URL" -f 'bv*[height=1080]+ba/best' --merge-output-format mp4

def extract_frames_from_video(video_path, output_dir, frame_interval=30):
    os.makedirs(output_dir, exist_ok=True)
    
    # Open video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video {video_path}")
        return 0
    
    # Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"Processing: {os.path.basename(video_path)}")
    print(f"  FPS: {fps}, Total frames: {total_frames}")
    
    frame_count = 0
    saved_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Save every frame_interval-th frame
        if frame_count % frame_interval == 0:
            output_path = os.path.join(output_dir, f"frame_{frame_count:06d}.jpg")
            cv2.imwrite(output_path, frame)
            saved_count += 1
            
            # Show progress every 10 saved frames
            if saved_count % 10 == 0:
                print(f"  Saved {saved_count} frames...")
        
        frame_count += 1
    
    cap.release()
    print(f"  Extracted {saved_count} frames from {frame_count} total frames\n")
    return saved_count

def main():
    # Base paths
    videos_dir = "src/yt/videos"
    base_output_dir = "src/yt/frames"
    
    # List of video files to process
    video_files = [
        "How to perform CPR - A Step-by-Step Guide.mp4",
        "Chest Compressions (CPR Steps).mp4",
        "How to Perform Hands-Only CPR.mp4",
        "How to do CPR on an Adult (Ages 12 and Older).mp4",
        "How to do CPR on an Adult - First Aid Training - St John Ambulance.mp4",
        "CPR - Simple steps to save a life - Animated Explanation Video - Health Sketch.mp4",
        "CPR⧸AED.mp4",
        "CPR in Action ｜ A 3D look inside the body.mp4",
        "Cardiopulmonary resuscitation (CPR)： Simple steps to save a life - First Aid Training video.mp4",
        "Restart A Heart Day CPR tutorial video.mp4",
        "New Hands-Only CPR Instructional Video.mp4",
        "CPR ⧸ AED Emergency Response Refresher.mp4",
        "How to perform CPR (Cardiopulmonary resuscitation) ｜ First Aid ｜ iHASCO.mp4",
        "The Recovery Position - First Aid Training - St John Ambulance.mp4",
        "How to Perform CPR on Adults & Infants ｜ In Case of Emergency ｜ Mass General Brigham.mp4",
        "Save a Life Cymru - Training video.mp4",
        "Hoe moet je reanimeren？ - EHBO.mp4",
        "Migimigi izziv： Reši življenje z Jernejem Celcem.mp4",
        "Migimigi izziv： Reši življenje z Jernejem Celcem – oživljanje.mp4",
        "Temeljni postopki oživljanja in uporaba defibrilatorja (HQ).mp4"
    ]
    
    total_frames_extracted = 0
    
    print("=" * 60)
    print("CPR Video Frame Extraction")
    print("=" * 60 + "\n")
    
    for video_file in video_files:
        video_path = os.path.join(videos_dir, video_file)
        
        # Check if video exists
        if not os.path.exists(video_path):
            print(f"Warning: Video not found - {video_file}")
            print("-" * 40 + "\n")
            continue
        
        # Create output directory for this video
        # Use video filename without extension as directory name
        video_name = Path(video_file).stem
        # Clean the name to be filesystem-friendly
        clean_name = video_name.replace(" - ", "_").replace(" ", "_").replace("(", "").replace(")", "")
        output_dir = os.path.join(base_output_dir, clean_name)
        
        # Check if this video has already been processed
        if os.path.exists(output_dir) and len(os.listdir(output_dir)) > 0:
            existing_frames = len([f for f in os.listdir(output_dir) if f.endswith('.jpg')])
            print(f"Skipping: {video_file}")
            print(f"  Already processed with {existing_frames} frames")
            print("-" * 40 + "\n")
            total_frames_extracted += existing_frames
            continue
        
        # Extract frames
        frames = extract_frames_from_video(video_path, output_dir, frame_interval=30)
        total_frames_extracted += frames
    
    print("=" * 60)
    print(f"Extraction complete!")
    print(f"Total frames extracted: {total_frames_extracted}")
    print(f"Output directory: {base_output_dir}")
    print("=" * 60)

if __name__ == "__main__":
    main()
