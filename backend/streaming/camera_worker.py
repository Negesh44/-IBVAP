import os
import io
import time
import queue
import logging
import threading
from typing import Optional, Callable, Dict, Any
import numpy as np
from PIL import Image

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

from streaming.rtsp_manager import RTSPStreamCapture, StreamStatus
from streaming.frame_processor import frame_processor

logger = logging.getLogger("ibvap.camera_worker")


class CameraWorker:
    """
    Dedicated background worker thread executing real-time ingestion & AI vision pipeline
    for an individual CCTV camera channel without blocking FastAPI.
    """

    def __init__(
        self,
        camera_id: str,
        name: str = "CCTV Camera",
        location: str = "Border Perimeter",
        rtsp_url: Optional[str] = None,
        process_fps: Optional[float] = None,
        telemetry_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None
    ):
        self.camera_id = camera_id
        self.name = name
        self.location = location
        self.rtsp_url = rtsp_url
        self.process_fps = process_fps or float(os.getenv("PROCESS_FPS", 5.0))
        self.telemetry_callback = telemetry_callback

        self.stream_capture = RTSPStreamCapture(camera_id=camera_id, rtsp_url=rtsp_url)
        self.frame_queue: queue.Queue = queue.Queue(maxsize=2)
        self._stop_event = threading.Event()
        self._worker_thread: Optional[threading.Thread] = None

        # State and Performance Metrics
        self.is_running = False
        self.fps_actual = 0.0
        self.frames_processed = 0
        self.last_telemetry: Optional[Dict[str, Any]] = None
        self.latest_frame_jpeg: Optional[bytes] = None
        self.last_error: Optional[str] = None

    def start(self):
        """
        Launches background streaming thread.
        """
        if self.is_running:
            logger.warning(f"[{self.camera_id}] Worker already active.")
            return

        self._stop_event.clear()
        self.is_running = True
        self.stream_capture.connect()

        self._worker_thread = threading.Thread(
            target=self._run_loop,
            name=f"CameraWorker-{self.camera_id}",
            daemon=True
        )
        self._worker_thread.start()
        logger.info(f"[{self.camera_id}] Processing started at target {self.process_fps} FPS.")

    def stop(self):
        """
        Gracefully halts worker thread and releases OpenCV resources.
        """
        if not self.is_running:
            return

        logger.info(f"[{self.camera_id}] Stopping processing worker...")
        self.is_running = False
        self._stop_event.set()

        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=2.0)

        self.stream_capture.release()

        # Drain frame queue
        while not self.frame_queue.empty():
            try:
                self.frame_queue.get_nowait()
            except queue.Empty:
                break

        logger.info(f"[{self.camera_id}] Processing stopped and resources released.")

    def _run_loop(self):
        """
        Main worker loop: Frame acquisition → Rate Throttling → Vision Pipeline → WebSocket Telemetry.
        """
        target_interval = 1.0 / max(1.0, self.process_fps)
        last_process_time = 0.0

        while not self._stop_event.is_set():
            t_loop_start = time.time()

            try:
                # 1. Read Frame from Stream
                ret, frame = self.stream_capture.read_frame()
                if not ret or frame is None:
                    time.sleep(0.1)
                    continue

                # 2. Rate Limiting Check (Skip frames to maintain target process_fps)
                now = time.time()
                if (now - last_process_time) < target_interval:
                    sleep_dur = max(0.005, target_interval - (now - last_process_time))
                    time.sleep(sleep_dur)

                # 3. Store latest preview frame in JPEG bytes
                try:
                    if HAS_OPENCV and isinstance(frame, np.ndarray):
                        preview_frame = cv2.resize(frame, (640, 360))
                        _, jpeg_buf = cv2.imencode(".jpg", preview_frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
                        self.latest_frame_jpeg = jpeg_buf.tobytes()
                    else:
                        img = Image.fromarray(frame).resize((640, 360))
                        buf = io.BytesIO()
                        img.save(buf, format="JPEG", quality=75)
                        self.latest_frame_jpeg = buf.getvalue()
                except Exception as e:
                    logger.debug(f"[{self.camera_id}] Preview encoding error: {e}")

                # 4. Execute AI Vision Pipeline
                telemetry = frame_processor.process_frame(
                    camera_id=self.camera_id,
                    frame_bgr=frame
                )

                self.last_telemetry = telemetry
                self.frames_processed += 1
                last_process_time = time.time()

                # Log generated events
                if telemetry.get("events"):
                    for evt in telemetry["events"]:
                        logger.info(f"[{self.camera_id}] Event Generated: [{evt.get('severity')}] {evt.get('event_type')} - {evt.get('description')}")

                # 5. Dispatch Telemetry to WebSocket Handler
                if self.telemetry_callback:
                    self.telemetry_callback(self.camera_id, telemetry)

                # Calculate actual FPS
                elapsed = time.time() - t_loop_start
                if elapsed > 0:
                    self.fps_actual = round(1.0 / elapsed, 1)

            except Exception as e:
                self.last_error = str(e)
                logger.error(f"[{self.camera_id}] Pipeline error: {e}", exc_info=True)
                time.sleep(0.2)

    def get_status(self) -> Dict[str, Any]:
        """
        Returns real-time worker diagnostic status.
        """
        return {
            "camera_id": self.camera_id,
            "name": self.name,
            "location": self.location,
            "status": self.stream_capture.status.value,
            "is_running": self.is_running,
            "target_fps": self.process_fps,
            "actual_fps": self.fps_actual,
            "frames_processed": self.frames_processed,
            "last_error": self.last_error,
            "has_preview": self.latest_frame_jpeg is not None
        }
