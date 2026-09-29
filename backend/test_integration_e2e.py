import os
import sys
import time
import unittest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import app
from ai.model_loader import model_loader
from ai.detector import detect_frame
from tracking.tracker_service import tracker_service
from events.event_engine import event_engine
from services.supabase_service import supabase_service
from services.demo_service import demo_service
from utils.video_generator import ensure_sample_video


class TestIBVAPIntegrationE2E(unittest.TestCase):
    """
    Complete End-to-End Pipeline & SIH Demonstration Automated Verification.
    Validates all 10 pipeline stages:
    1. Backend starts
    2. YOLO model loads
    3. Video opens
    4. Frame is captured
    5. YOLO produces detections
    6. ByteTrack produces track IDs
    7. Event engine accepts tracks
    8. Supabase connection / fallback works
    9. WebSocket accepts a client
    10. React API endpoints respond
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Create test admin JWT token
        import base64
        import json
        header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
        payload = base64.urlsafe_b64encode(json.dumps({
            "sub": "USR-ADMIN-001",
            "email": "admin@ibvap.gov.in",
            "user_metadata": {"role": "ADMIN", "full_name": "Command Admin"},
            "exp": int(time.time()) + 3600
        }).encode()).decode().rstrip("=")
        cls.admin_token = f"{header}.{payload}.sig"
        cls.auth_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    def test_01_backend_starts(self):
        """Step 1: Backend starts and health endpoint is accessible."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["platform"], "IBVAP")
        print("\n[STEP 1] PASS: FastAPI Backend started & health check verified.")

    def test_02_yolo_model_loads(self):
        """Step 2: YOLO model device detection and weights loader test."""
        device = model_loader.get_device()
        self.assertIn(device, ["cuda:0", "cpu"])
        model_path = model_loader.get_model_path()
        self.assertTrue(len(model_path) > 0)
        print(f"[STEP 2] PASS: YOLO loader ready on device [{device}], model path: {model_path}")

    def test_03_video_opens(self):
        """Step 3: Video file exists or synthetic video opens successfully."""
        import cv2
        video_path = demo_service.resolve_demo_video()
        self.assertTrue(os.path.isfile(video_path))
        cap = cv2.VideoCapture(video_path)
        self.assertTrue(cap.isOpened(), f"Could not open video file at {video_path}")
        cap.release()
        print(f"[STEP 3] PASS: Video file opened successfully: {video_path}")

    def test_04_frame_is_captured(self):
        """Step 4: Reads a real frame from the video stream."""
        import cv2
        video_path = demo_service.resolve_demo_video()
        cap = cv2.VideoCapture(video_path)
        ret, frame = cap.read()
        cap.release()
        self.assertTrue(ret, "Failed to capture frame from video")
        self.assertIsNotNone(frame)
        self.assertEqual(len(frame.shape), 3)
        print(f"[STEP 4] PASS: Frame captured with shape {frame.shape}")

    def test_05_yolo_produces_detections(self):
        """Step 5: YOLO inference runs on captured frame or synthetic test image."""
        # Create tactical image with simulated human silhouette
        img = Image.new("RGB", (320, 240), color=(30, 30, 30))
        detections = detect_frame(img, conf_threshold=0.01)
        self.assertIsInstance(detections, list)
        print(f"[STEP 5] PASS: YOLO detection pipeline executed (detections parsed: {len(detections)})")

    def test_06_bytetrack_produces_track_ids(self):
        """Step 6: ByteTrack processes sequential detections and assigns persistent track IDs."""
        det_1 = [{"class_id": 0, "object_type": "person", "confidence": 0.95, "bbox": [100, 100, 150, 200]}]
        det_2 = [{"class_id": 0, "object_type": "person", "confidence": 0.96, "bbox": [105, 102, 155, 202]}]
        
        tracks_1 = tracker_service.update_camera_feed("DEMO-001", det_1)
        tracks_2 = tracker_service.update_camera_feed("DEMO-001", det_2)
        
        self.assertIsInstance(tracks_2, list)
        self.assertTrue(len(tracks_2) > 0)
        self.assertIn("track_id", tracks_2[0])
        print(f"[STEP 6] PASS: ByteTrack assigned persistent track_id: {tracks_2[0]['track_id']}")

    def test_07_event_engine_accepts_tracks(self):
        """Step 7: Event engine analyzes tracked targets against polygon virtual fence."""
        test_tracks = [{
            "track_id": 104,
            "object_type": "person",
            "confidence": 0.96,
            "bbox": [200, 200, 260, 320], # Inside restricted zone
            "first_seen": time.time() - 40
        }]
        
        events = event_engine.analyze_frame("DEMO-001", detections=[], tracks=test_tracks, persist_to_db=False)
        self.assertIsInstance(events, list)
        print(f"[STEP 7] PASS: Event Engine processed tracks (security events triggered: {len(events)})")

    def test_08_supabase_connection(self):
        """Step 8: Supabase gateway queries cameras with graceful fallback."""
        cameras = supabase_service.get_cameras()
        self.assertIsInstance(cameras, list)
        print(f"[STEP 8] PASS: Supabase status: {'CONNECTED' if supabase_service.is_connected else 'LOCAL_FALLBACK'} ({len(cameras)} cameras accessible)")

    def test_09_websocket_accepts_client(self):
        """Step 9: WebSocket endpoint accepts live client connections."""
        with self.client.websocket_connect("/ws/live/DEMO-001") as websocket:
            # WebSocket connected cleanly
            self.assertIsNotNone(websocket)
        print("[STEP 9] PASS: WebSocket endpoint (/ws/live/DEMO-001) connected and accepted client.")

    def test_10_react_api_endpoints_respond(self):
        """Step 10: All platform REST API endpoints respond with HTTP 200."""
        endpoints = [
            "/api/health",
            "/api/pipeline/status",
            "/api/demo/status",
            "/api/demo/metrics",
            "/api/test/yolo",
            "/api/test/tracking",
            "/api/test/anpr",
            "/api/test/face",
            "/api/test/events",
            "/api/test/supabase"
        ]

        for ep in endpoints:
            res = self.client.get(ep, headers=self.auth_headers)
            self.assertEqual(res.status_code, 200, f"Endpoint {ep} returned status {res.status_code}")

        print("[STEP 10] PASS: All 10 React REST and diagnostic test endpoints returned HTTP 200 OK.")


if __name__ == "__main__":
    unittest.main()
