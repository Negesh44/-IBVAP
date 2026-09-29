import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.system_monitor import SystemMonitor, system_monitor
from streaming.stream_manager import stream_manager
from fastapi.testclient import TestClient
from main import app


import jwt
import time

def get_auth_token():
    payload = {
        "sub": "USR-TEST-MONITOR",
        "email": "monitor@ibvap.gov.in",
        "user_metadata": {"role": "ADMIN", "full_name": "System Monitor Admin"},
        "exp": int(time.time()) + 3600
    }
    return jwt.encode(payload, "secure_32_byte_secret_key_for_testing_purposes!", algorithm="HS256")


class TestSystemHealthAndMetrics(unittest.TestCase):
    """
    Test suite for IBVAP System Health, Hardware Telemetry, Performance Metrics, and Graceful Fallbacks.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.token = get_auth_token()

    def test_01_system_health_endpoint(self):
        """Tests GET /api/system/health returns correct schema and real values."""
        response = self.client.get(
            "/api/system/health",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()

        print("\n==================================================")
        print("[1] Testing GET /api/system/health")
        print("==================================================")
        print(f"Status: {data.get('status')}")
        print(f"Uptime Seconds: {data.get('uptime_seconds')}")
        print(f"CPU %: {data.get('cpu_percent')}, Memory %: {data.get('memory_percent')}")
        print(f"GPU Available: {data.get('gpu_available')}, GPU Name: {data.get('gpu_name')}")
        print(f"Active Cameras: {data.get('active_cameras')}, Processing FPS: {data.get('processing_fps')}")

        self.assertIn(data["status"], ["healthy", "warning", "degraded"])
        self.assertIsInstance(data["uptime_seconds"], (int, float))
        self.assertIsInstance(data["cpu_percent"], (int, float))
        self.assertIsInstance(data["memory_percent"], (int, float))
        self.assertIsInstance(data["gpu_available"], bool)
        self.assertIsInstance(data["active_cameras"], int)
        self.assertIsInstance(data["processing_fps"], (int, float))
        self.assertIsInstance(data["average_inference_ms"], (int, float))
        print("SUCCESS: System health response adheres to contract schema.")

    def test_02_system_metrics_endpoint(self):
        """Tests GET /api/system/metrics returns granular component latencies."""
        # Record a test frame latency
        system_monitor.record_frame_latency(
            yolo_ms=22.4,
            tracking_ms=2.8,
            face_ms=12.1,
            anpr_ms=15.3,
            event_ms=1.9,
            total_ms=44.5
        )

        response = self.client.get(
            "/api/system/metrics",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()

        print("\n==================================================")
        print("[2] Testing GET /api/system/metrics")
        print("==================================================")
        lat = data.get("latency_ms", {})
        print(f"YOLO Inference: {lat.get('average_yolo_inference_ms')} ms")
        print(f"ByteTrack Latency: {lat.get('average_tracking_ms')} ms")
        print(f"Face Rec Latency: {lat.get('average_face_rec_ms')} ms")
        print(f"ANPR Latency: {lat.get('average_anpr_ms')} ms")
        print(f"Event Engine: {lat.get('average_event_engine_ms')} ms")
        print(f"Frames Processed: {data.get('frames_processed')}")

        self.assertIn("health", data)
        self.assertIn("latency_ms", data)
        self.assertGreaterEqual(data["frames_processed"], 1)
        self.assertIsInstance(lat.get("average_yolo_inference_ms"), (int, float))
        print("SUCCESS: Pipeline latency metrics verified.")

    def test_03_gpu_unavailable_graceful_fallback(self):
        """Tests system monitor behavior when GPU is absent or disabled."""
        test_monitor = SystemMonitor(history_len=10)

        with patch("services.system_monitor.HAS_TORCH", False), \
             patch("shutil.which", return_value=None):
            gpu_info = test_monitor.get_gpu_info()
            health = test_monitor.get_system_health(active_cameras=0)

            print("\n==================================================")
            print("[3] Testing GPU Unavailable Graceful Fallback")
            print("==================================================")
            print(f"GPU Available: {gpu_info['gpu_available']}")
            print(f"GPU Name: {gpu_info['gpu_name']}")
            print(f"Fallback Health GPU: {health['gpu_available']}, Name: {health['gpu_name']}")

            self.assertFalse(gpu_info["gpu_available"])
            self.assertEqual(gpu_info["gpu_memory_used_mb"], 0)
            self.assertFalse(health["gpu_available"])
            self.assertIn("CPU", health["gpu_name"])
            print("SUCCESS: System health operates reliably without GPU.")

    def test_04_zero_camera_case(self):
        """Tests system monitor behavior when zero cameras are registered or streaming."""
        test_monitor = SystemMonitor(history_len=10)
        health = test_monitor.get_system_health(active_cameras=0)
        metrics = test_monitor.get_performance_metrics(active_cameras=0, camera_details=[])

        print("\n==================================================")
        print("[4] Testing Zero-Camera Fleet Scenario")
        print("==================================================")
        print(f"Active Cameras: {health['active_cameras']}")
        print(f"Processing FPS: {health['processing_fps']}")
        print(f"Metrics Cameras Count: {metrics['active_cameras_count']}")

        self.assertEqual(health["active_cameras"], 0)
        self.assertEqual(health["processing_fps"], 0.0)
        self.assertEqual(metrics["active_cameras_count"], 0)
        self.assertEqual(metrics["cameras"], [])
        print("SUCCESS: Zero-camera state handled gracefully.")

    def test_05_empty_analytics_and_history(self):
        """Tests system monitor with freshly initialized deques (empty history)."""
        fresh_monitor = SystemMonitor(history_len=50)
        health = fresh_monitor.get_system_health(active_cameras=2)
        metrics = fresh_monitor.get_performance_metrics(active_cameras=2)

        print("\n==================================================")
        print("[5] Testing Empty History & Cold Start Analytics")
        print("==================================================")
        print(f"Frames Processed: {fresh_monitor.frames_processed}")
        print(f"Average Total Latency: {metrics['latency_ms']['average_total_ms']} ms")

        self.assertEqual(fresh_monitor.frames_processed, 0)
        self.assertEqual(fresh_monitor.frames_skipped, 0)
        self.assertGreater(metrics["latency_ms"]["average_total_ms"], 0)
        print("SUCCESS: Cold start empty telemetry handled without division by zero.")


if __name__ == "__main__":
    unittest.main()
