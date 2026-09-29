import os
import cv2
import numpy as np
import logging
from pathlib import Path

logger = logging.getLogger("ibvap.video_generator")


def ensure_sample_video(output_path: str = "sample_feed.mp4", duration_sec: int = 15, fps: int = 20) -> str:
    """
    Checks if a demo video file exists; if not, generates a synthetic surveillance video
    containing moving simulated human/vehicle silhouettes and tactical border outpost overlays.
    Supports MP4/AVI/MOV.
    """
    path = Path(output_path)
    if path.is_file() and path.stat().st_size > 1000:
        return str(path)

    # Ensure parent directory exists
    path.parent.mkdir(parents=True, exist_ok=True)

    width, height = 640, 480
    total_frames = duration_sec * fps
    
    # Try H264 or mp4v codec
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(path), fourcc, fps, (width, height))

    if not out.isOpened():
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        path_avi = path.with_suffix(".avi")
        out = cv2.VideoWriter(str(path_avi), fourcc, fps, (width, height))
        output_path = str(path_avi)

    logger.info(f"Generating synthetic tactical demonstration video: {output_path} ({total_frames} frames)...")

    # Restricted zone polygon coordinates
    zone_pts = np.array([[100, 150], [540, 150], [540, 420], [100, 420]], np.int32)

    for f in range(total_frames):
        # Create dark tactical border surveillance background
        frame = np.full((height, width, 3), 28, dtype=np.uint8)

        # Draw grid lines
        for y in range(0, height, 60):
            cv2.line(frame, (0, y), (width, y), (40, 40, 40), 1)
        for x in range(0, width, 80):
            cv2.line(frame, (x, 0), (x, height), (40, 40, 40), 1)

        # Draw Virtual Restricted Zone overlay (Semi-transparent red)
        overlay = frame.copy()
        cv2.fillPoly(overlay, [zone_pts], (0, 0, 80))
        cv2.polylines(overlay, [zone_pts], True, (0, 0, 220), 2)
        cv2.putText(overlay, "RESTRICTED BORDER ZONE [BOP-001]", (110, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 100, 255), 1)
        frame = cv2.addWeighted(overlay, 0.4, frame, 0.6, 0)

        # Simulated Target 1: Human walking across restricted perimeter
        t1_x = int(60 + (f * 3.5) % (width - 120))
        t1_y = int(220 + 20 * np.sin(f * 0.1))
        # Draw simulated human torso and head
        cv2.circle(frame, (t1_x + 15, t1_y - 25), 10, (200, 200, 200), -1) # Head
        cv2.rectangle(frame, (t1_x, t1_y - 15), (t1_x + 30, t1_y + 40), (180, 150, 120), -1) # Body
        cv2.line(frame, (t1_x + 5, t1_y + 40), (t1_x, t1_y + 70), (150, 120, 100), 3) # Leg L
        cv2.line(frame, (t1_x + 25, t1_y + 40), (t1_x + 30, t1_y + 70), (150, 120, 100), 3) # Leg R

        # Simulated Target 2: Vehicle moving along lower boundary
        t2_x = int(width - 100 - (f * 4.0) % (width + 50))
        t2_y = 380
        # Draw vehicle body
        cv2.rectangle(frame, (t2_x, t2_y), (t2_x + 90, t2_y + 35), (80, 120, 160), -1)
        cv2.rectangle(frame, (t2_x + 20, t2_y - 18), (t2_x + 70, t2_y), (100, 150, 200), -1)
        # License plate region (White box on vehicle)
        cv2.rectangle(frame, (t2_x + 30, t2_y + 15), (t2_x + 65, t2_y + 28), (255, 255, 255), -1)
        cv2.putText(frame, "DL8C", (t2_x + 32, t2_y + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 0), 1)
        # Wheels
        cv2.circle(frame, (t2_x + 20, t2_y + 35), 8, (10, 10, 10), -1)
        cv2.circle(frame, (t2_x + 70, t2_y + 35), 8, (10, 10, 10), -1)

        # Tactical HUD Overlay
        cv2.putText(frame, "IBVAP SIH LIVE SURVEILLANCE FEED", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 128), 2)
        cv2.putText(frame, f"CAM: DEMO-001 | TIME: 2026-09-29 {f//fps:02d}:{(f%fps)*3:02d} | 20 FPS", (15, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1)

        out.write(frame)

    out.release()
    logger.info(f"Synthetic tactical demonstration video successfully generated at: {output_path}")
    return output_path
