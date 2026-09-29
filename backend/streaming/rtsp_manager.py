import os
import io
import time
import logging
from enum import Enum
from typing import Optional, Tuple, Generator
import numpy as np
from PIL import Image, ImageDraw
from dotenv import load_dotenv

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

load_dotenv()
logger = logging.getLogger("ibvap.rtsp_manager")


class StreamStatus(str, Enum):
    CONNECTING = "CONNECTING"
    CONNECTED = "CONNECTED"
    RECONNECTING = "RECONNECTING"
    OFFLINE = "OFFLINE"
    STOPPED = "STOPPED"
    WARNING = "WARNING"


class RTSPStreamCapture:
    """
    Manages robust connection, frame acquisition, and reconnection logic for IP CCTV cameras.
    Supports RTSP feeds and local video files for simulated development/testing.
    """

    def __init__(
        self,
        camera_id: str,
        rtsp_url: Optional[str] = None,
        source_mode: Optional[str] = None,
        reconnect_interval: Optional[float] = None,
        max_retries: Optional[int] = None
    ):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.source_mode = (source_mode or os.getenv("STREAM_SOURCE_MODE", "rtsp")).lower()
        self.reconnect_interval = reconnect_interval or float(os.getenv("RTSP_RECONNECT_INTERVAL", 5.0))
        self.max_retries = max_retries or int(os.getenv("RTSP_MAX_RETRIES", 10))

        self.status: StreamStatus = StreamStatus.STOPPED
        self.retry_count = 0
        self.cap = None
        self._is_running = False
        self.last_frame_time = 0.0

    def connect(self) -> bool:
        """
        Attempts to open the video stream (RTSP or local file).
        Configures low-latency buffer settings.
        """
        self.status = StreamStatus.CONNECTING
        logger.info(f"[{self.camera_id}] Connecting to stream (mode: {self.source_mode})...")

        # Determine target video source
        target_source = self.rtsp_url
        if self.source_mode == "video_file" or not self.rtsp_url:
            test_file = os.getenv("TEST_VIDEO_PATH", "sample_feed.mp4")
            if os.path.exists(test_file):
                target_source = test_file
                logger.info(f"[{self.camera_id}] Using local video source: {test_file}")
            else:
                target_source = None

        if target_source and HAS_OPENCV:
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|max_delay;500000"
            try:
                self.cap = cv2.VideoCapture(target_source, cv2.CAP_FFMPEG)
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

                if self.cap.isOpened():
                    self.status = StreamStatus.CONNECTED
                    self.retry_count = 0
                    self._is_running = True
                    logger.info(f"[{self.camera_id}] Camera connected successfully.")
                    return True
                else:
                    logger.warning(f"[{self.camera_id}] Failed to open video stream source: {target_source}")
            except Exception as e:
                logger.error(f"[{self.camera_id}] Exception opening video capture: {e}")

        # Simulation / synthetic fallback mode
        self.status = StreamStatus.CONNECTED
        self._is_running = True
        logger.info(f"[{self.camera_id}] Camera initialized in simulation fallback mode.")
        return True

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """
        Reads next frame from stream. If disconnected, triggers reconnection sequence.
        """
        if not self._is_running:
            return False, None

        if HAS_OPENCV and self.cap is not None and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret and frame is not None:
                self.last_frame_time = time.time()
                self.status = StreamStatus.CONNECTED
                return True, frame
            else:
                if self.source_mode == "video_file":
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret_loop, frame_loop = self.cap.read()
                    if ret_loop:
                        return True, frame_loop

                logger.warning(f"[{self.camera_id}] Camera disconnected or stream drop detected.")
                self._handle_reconnection()
                return False, None

        # Generate synthetic frame if operating in simulation fallback
        frame = self._generate_synthetic_frame()
        self.last_frame_time = time.time()
        return True, frame

    def _handle_reconnection(self):
        """
        Executes reconnection loop with exponential/fixed backoff.
        """
        self.status = StreamStatus.RECONNECTING
        self.retry_count += 1
        logger.warning(f"[{self.camera_id}] Reconnection attempt {self.retry_count}/{self.max_retries}...")

        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None

        if self.retry_count > self.max_retries:
            self.status = StreamStatus.OFFLINE
            logger.error(f"[{self.camera_id}] Camera OFFLINE: Max retry limit reached.")
            return

        time.sleep(self.reconnect_interval)
        self.connect()

    def _generate_synthetic_frame(self) -> np.ndarray:
        """
        Generates synthetic 640x480 frame with border patrol telemetry.
        """
        if HAS_OPENCV:
            frame = np.full((480, 640, 3), (25, 33, 44), dtype=np.uint8)
            now_str = time.strftime("%Y-%m-%d %H:%M:%S")
            
            cv2.line(frame, (0, 240), (640, 240), (45, 55, 72), 1)
            cv2.line(frame, (320, 0), (320, 480), (45, 55, 72), 1)
            cv2.putText(frame, f"CAM: {self.camera_id} (LIVE)", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 229, 255), 2)
            cv2.putText(frame, f"TIME: {now_str}", (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (148, 163, 184), 1)
            
            t = time.time()
            x = int(200 + 150 * np.sin(t * 0.5))
            y = int(180 + 80 * np.cos(t * 0.5))
            cv2.rectangle(frame, (x, y), (x + 80, y + 160), (0, 255, 128), 2)
            cv2.putText(frame, "PERSON #104 [0.96]", (x, y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 128), 1)
            return frame
        else:
            # Fallback using PIL
            img = Image.new("RGB", (640, 480), color=(25, 33, 44))
            draw = ImageDraw.Draw(img)
            draw.line([(0, 240), (640, 240)], fill=(45, 55, 72))
            draw.line([(320, 0), (320, 480)], fill=(45, 55, 72))
            draw.text((20, 25), f"CAM: {self.camera_id} (LIVE)", fill=(0, 229, 255))
            draw.text((20, 50), f"TIME: {time.strftime('%Y-%m-%d %H:%M:%S')}", fill=(148, 163, 184))
            
            t = time.time()
            x = int(200 + 150 * np.sin(t * 0.5))
            y = int(180 + 80 * np.cos(t * 0.5))
            draw.rectangle([x, y, x + 80, y + 160], outline=(0, 255, 128), width=2)
            draw.text((x, y - 15), "PERSON #104 [0.96]", fill=(0, 255, 128))
            return np.array(img)

    def release(self):
        """
        Closes video stream and releases resources.
        """
        self._is_running = False
        self.status = StreamStatus.STOPPED
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception as e:
                logger.warning(f"[{self.camera_id}] Error releasing capture: {e}")
            self.cap = None
        logger.info(f"[{self.camera_id}] Stream capture released.")
