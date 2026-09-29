import os
import asyncio
import logging
import torch
from typing import Dict, Any, List, Optional, Set
from fastapi import WebSocket

from streaming.camera_worker import CameraWorker
from services.supabase_service import supabase_service

logger = logging.getLogger("ibvap.stream_manager")


class StreamManager:
    """
    Fleet Stream Manager.
    Manages active camera workers, WebSocket client broadcasting per camera channel,
    and system streaming health metrics.
    """

    def __init__(self):
        # camera_id -> CameraWorker
        self._workers: Dict[str, CameraWorker] = {}

        # camera_id -> Set of connected WebSockets
        self._subscribers: Dict[str, Set[WebSocket]] = {}

        # Global event loop reference for async WebSocket dispatching from background threads
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    def _on_worker_telemetry(self, camera_id: str, telemetry: Dict[str, Any]):
        """
        Callback fired from CameraWorker background thread when a new telemetry packet is ready.
        Dispatches async WebSocket broadcast.
        """
        if self._loop and not self._loop.is_closed():
            asyncio.run_coroutine_threadsafe(
                self.broadcast_to_camera(camera_id, telemetry),
                self._loop
            )

    async def broadcast_to_camera(self, camera_id: str, telemetry: Dict[str, Any]):
        """
        Broadcasts telemetry JSON to all active WebSocket clients subscribed to camera_id.
        """
        subscribers = self._subscribers.get(camera_id, set())
        if not subscribers:
            return

        dead_clients = []
        for ws in list(subscribers):
            try:
                await ws.send_json(telemetry)
            except Exception:
                dead_clients.append(ws)

        for dead in dead_clients:
            self.unregister_client(camera_id, dead)

    def register_client(self, camera_id: str, websocket: WebSocket):
        if camera_id not in self._subscribers:
            self._subscribers[camera_id] = set()
        self._subscribers[camera_id].add(websocket)
        logger.info(f"WebSocket client connected to camera '{camera_id}'. Total channel clients: {len(self._subscribers[camera_id])}")

    def unregister_client(self, camera_id: str, websocket: WebSocket):
        if camera_id in self._subscribers:
            self._subscribers[camera_id].discard(websocket)
            logger.info(f"WebSocket client disconnected from camera '{camera_id}'. Total channel clients: {len(self._subscribers[camera_id])}")

    def start_camera(self, camera_id: str, rtsp_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Starts or restarts video ingestion worker for a camera.
        """
        if camera_id in self._workers and self._workers[camera_id].is_running:
            return {
                "status": "ALREADY_RUNNING",
                "camera_id": camera_id,
                "message": f"Camera worker '{camera_id}' is already active."
            }

        # Query camera info from Supabase if not provided
        cam_info = supabase_service.get_camera_by_id(camera_id) or {}
        name = cam_info.get("name", f"Camera {camera_id}")
        location = cam_info.get("location", "Border Zone")
        url = rtsp_url or cam_info.get("rtsp_url")

        worker = CameraWorker(
            camera_id=camera_id,
            name=name,
            location=location,
            rtsp_url=url,
            telemetry_callback=self._on_worker_telemetry
        )

        self._workers[camera_id] = worker
        worker.start()

        return {
            "status": "STARTED",
            "camera_id": camera_id,
            "name": name,
            "location": location,
            "message": f"CCTV ingestion pipeline started for camera '{camera_id}'."
        }

    def stop_camera(self, camera_id: str) -> Dict[str, Any]:
        """
        Stops the camera worker and cleans up threads and captures.
        """
        worker = self._workers.get(camera_id)
        if not worker or not worker.is_running:
            return {
                "status": "NOT_RUNNING",
                "camera_id": camera_id,
                "message": f"Camera '{camera_id}' is not currently running."
            }

        worker.stop()
        del self._workers[camera_id]

        return {
            "status": "STOPPED",
            "camera_id": camera_id,
            "message": f"CCTV ingestion pipeline stopped for camera '{camera_id}'."
        }

    def get_camera_status(self, camera_id: str) -> Dict[str, Any]:
        """
        Returns status for a specific camera worker.
        """
        worker = self._workers.get(camera_id)
        if worker:
            return worker.get_status()

        # Check Supabase status
        cam_info = supabase_service.get_camera_by_id(camera_id)
        if cam_info:
            return {
                "camera_id": camera_id,
                "name": cam_info.get("name"),
                "location": cam_info.get("location"),
                "status": cam_info.get("status", "OFFLINE"),
                "is_running": False,
                "target_fps": float(os.getenv("PROCESS_FPS", 5.0)),
                "actual_fps": 0.0,
                "frames_processed": 0,
                "last_error": None,
                "has_preview": False
            }

        return {
            "camera_id": camera_id,
            "status": "OFFLINE",
            "is_running": False
        }

    def get_all_statuses(self) -> List[Dict[str, Any]]:
        """
        Returns statuses for all known cameras.
        """
        cameras = supabase_service.get_cameras()
        statuses = []
        for cam in cameras:
            cid = cam.get("camera_code") or cam.get("id")
            statuses.append(self.get_camera_status(cid))
        return statuses

    def get_latest_preview_frame(self, camera_id: str) -> Optional[bytes]:
        """
        Retrieves the latest encoded JPEG frame bytes for MJPEG preview.
        """
        worker = self._workers.get(camera_id)
        if worker:
            return worker.latest_frame_jpeg
        return None

    def get_health(self) -> Dict[str, Any]:
        """
        Health & diagnostic telemetry across the entire video streaming fleet.
        """
        active_count = sum(1 for w in self._workers.values() if w.is_running)
        gpu_available = torch.cuda.is_available()

        return {
            "active_cameras": active_count,
            "total_registered_cameras": len(supabase_service.get_cameras()),
            "processing_fps": float(os.getenv("PROCESS_FPS", 5.0)),
            "gpu_available": gpu_available,
            "gpu_device": torch.cuda.get_device_name(0) if gpu_available else "CPU (Fallback)",
            "cameras": self.get_all_statuses()
        }

    def stop_all(self):
        """
        Halt all active camera workers during application shutdown.
        """
        for cid, worker in list(self._workers.items()):
            try:
                worker.stop()
            except Exception as e:
                logger.warning(f"Error stopping worker {cid}: {e}")
        self._workers.clear()


# Global singleton fleet manager
stream_manager = StreamManager()
