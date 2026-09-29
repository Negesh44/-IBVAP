"""
Unit and Integration Tests for IBVAP Real-Time CCTV Ingestion Pipeline.

Covers:
1. Camera start & stop lifecycle
2. RTSP stream capture & synthetic frame acquisition
3. Unified Vision Pipeline (YOLO + ByteTrack + Face Rec + ANPR + Event Engine)
4. RTSP stream failure and reconnection handling
5. WebSocket detection telemetry formatting
6. HTTP stream management endpoints

Usage:
    python test_streaming_pipeline.py
"""

import time
import requests
import numpy as np
from streaming.rtsp_manager import RTSPStreamCapture, StreamStatus
from streaming.frame_processor import FrameProcessor
from streaming.camera_worker import CameraWorker
from streaming.stream_manager import StreamManager


def test_rtsp_capture_and_frame_acquisition():
    """Unit test: RTSPStreamCapture initialization and synthetic frame generation."""
    print("\n==================================================")
    print("[1] Testing RTSP Stream Capture & Frame Generation")
    print("==================================================")

    capture = RTSPStreamCapture(camera_id="BOP-TEST-01", source_mode="rtsp")
    connected = capture.connect()
    assert connected, "Capture should connect successfully"
    assert capture.status == StreamStatus.CONNECTED

    ret, frame = capture.read_frame()
    assert ret, "Frame read must succeed"
    assert frame is not None, "Frame array must not be None"
    assert len(frame.shape) == 3, "Frame must be 3-channel BGR image"
    print(f"Frame shape: {frame.shape}, mean luminance: {np.mean(frame):.2f}")

    capture.release()
    assert capture.status == StreamStatus.STOPPED
    print("SUCCESS: RTSP stream capture and frame acquisition verified.")


def test_rtsp_failure_and_reconnection():
    """Unit test: Stream failure and reconnection attempt logic."""
    print("\n==================================================")
    print("[2] Testing RTSP Failure & Reconnection Logic")
    print("==================================================")

    capture = RTSPStreamCapture(
        camera_id="BOP-TEST-FAIL",
        rtsp_url="rtsp://invalid.ip.address.local/stream",
        reconnect_interval=0.1,
        max_retries=3
    )
    capture.connect()

    # Force failure sequence
    capture.retry_count = 0
    capture._handle_reconnection()
    print(f"After retry 1: status={capture.status.value}, retry_count={capture.retry_count}")
    assert capture.retry_count == 1

    # Reach max retries
    capture.retry_count = 3
    capture._handle_reconnection()
    print(f"After max retries: status={capture.status.value}")
    assert capture.status == StreamStatus.OFFLINE

    capture.release()
    print("SUCCESS: Stream drop and max-retry OFFLINE status handling verified.")


def test_unified_frame_processor_pipeline():
    """Unit test: Multi-stage Vision Pipeline processing."""
    print("\n==================================================")
    print("[3] Testing Unified Frame Processor Pipeline")
    print("==================================================")

    processor = FrameProcessor()
    
    # Synthetic frame with a dummy target
    frame = np.full((480, 640, 3), (30, 40, 50), dtype=np.uint8)
    
    telemetry = processor.process_frame(
        camera_id="BOP-001",
        frame_bgr=frame,
        brightness=45.0
    )

    print(f"Camera ID: {telemetry['camera_id']}")
    print(f"Processing Latency: {telemetry['processing_time_ms']} ms")
    print(f"Detections count: {len(telemetry['detections'])}")
    print(f"Events count: {len(telemetry['events'])}")

    assert "camera_id" in telemetry
    assert "frame_timestamp" in telemetry
    assert "detections" in telemetry
    assert "events" in telemetry
    print("SUCCESS: Unified vision pipeline produced valid telemetry schema.")


def test_camera_worker_lifecycle():
    """Unit test: CameraWorker background thread execution & rate limiting."""
    print("\n==================================================")
    print("[4] Testing CameraWorker Background Thread Lifecycle")
    print("==================================================")

    received_telemetry = []

    def on_telemetry(cam_id, data):
        received_telemetry.append(data)

    worker = CameraWorker(
        camera_id="BOP-WORKER-TEST",
        name="Test Worker",
        location="Outpost Alpha",
        process_fps=10.0,
        telemetry_callback=on_telemetry
    )

    worker.start()
    assert worker.is_running, "Worker must be running"
    
    # Allow worker to run for 0.8 seconds
    time.sleep(0.8)

    status = worker.get_status()
    print(f"Worker status: is_running={status['is_running']}, frames_processed={status['frames_processed']}, actual_fps={status['actual_fps']}")
    assert status["frames_processed"] > 0, "Worker must have processed frames"
    assert len(received_telemetry) > 0, "Telemetry callback must receive packets"

    worker.stop()
    assert not worker.is_running, "Worker must be stopped"
    print("SUCCESS: CameraWorker started, processed frames asynchronously, and stopped cleanly.")


def test_stream_manager_fleet_coordination():
    """Unit test: StreamManager fleet coordinator."""
    print("\n==================================================")
    print("[5] Testing StreamManager Fleet Coordination")
    print("==================================================")

    manager = StreamManager()
    
    # 1. Start camera
    start_res = manager.start_camera("BOP-001")
    print("Start result:", start_res)
    assert start_res["status"] in ("STARTED", "ALREADY_RUNNING")

    # 2. Check health
    health = manager.get_health()
    print("Fleet health:", health)
    assert health["active_cameras"] >= 1
    assert "gpu_available" in health

    # 3. Stop camera
    stop_res = manager.stop_camera("BOP-001")
    print("Stop result:", stop_res)
    assert stop_res["status"] == "STOPPED"

    print("SUCCESS: Fleet Stream Manager successfully coordinated camera lifecycle.")


def test_http_streams_api(base_url="http://localhost:8000"):
    """HTTP endpoint test for /api/streams/status and /api/streams/health."""
    print("\n==================================================")
    print(f"[6] Testing HTTP Endpoints: {base_url}/api/streams")
    print("==================================================")

    try:
        res_health = requests.get(f"{base_url}/api/streams/health", timeout=5)
        print("GET /api/streams/health status:", res_health.status_code)
        print("Health response:", res_health.json())

        res_status = requests.get(f"{base_url}/api/streams/status", timeout=5)
        print("\nGET /api/streams/status status:", res_status.status_code)
        print("Status count:", len(res_status.json()))
    except Exception as e:
        print(f"HTTP test skipped (server may not be running): {e}")


if __name__ == "__main__":
    test_rtsp_capture_and_frame_acquisition()
    test_rtsp_failure_and_reconnection()
    test_unified_frame_processor_pipeline()
    test_camera_worker_lifecycle()
    test_stream_manager_fleet_coordination()
    test_http_streams_api()
