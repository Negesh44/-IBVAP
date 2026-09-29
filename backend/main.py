import os
import time
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Set, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

# Internal Imports
from models.schemas import HealthResponse, DetectionItem
from services.supabase_service import supabase_service
from services.detection_service import detection_service
from streaming.stream_manager import stream_manager

from api.cameras import router as cameras_router
from api.detections import router as detections_router
from api.events import router as events_router
from api.alerts import router as alerts_router
from api.tracking import router as tracking_router
from api.anpr import router as anpr_router
from api.face import router as face_router
from api.streams import router as streams_router
from api.evidence import router as evidence_router
from api.system import router as system_router
from api.users import router as users_router
from api.audit import router as audit_router
from api.demo import router as demo_router
from api.pipeline import router as pipeline_router
from api.testing import router as testing_router

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ibvap.backend")

START_TIME = time.time()


# WebSocket Connection Manager for Legacy Global Broadcasts
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total global clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total global clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting IBVAP Backend & Real-Time CCTV Streaming Layer...")
    logger.info(f"Supabase Gateway Status: {'CONNECTED' if supabase_service.is_connected else 'LOCAL FALLBACK'}")
    
    # Register running asyncio loop for thread-safe WebSocket broadcast
    stream_manager.set_event_loop(asyncio.get_running_loop())
    
    yield
    
    logger.info("Shutting down IBVAP CCTV Streaming fleet...")
    stream_manager.stop_all()
    logger.info("IBVAP Backend Service shutdown complete.")


app = FastAPI(
    title="IBVAP Backend API",
    description="Intelligent Border Video Analytics Platform — FastAPI Real-Time CCTV Ingestion & AI Pipeline",
    version="1.0.0",
    lifespan=lifespan
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Hardened CORS Configuration (Development Localhost + Configured Origins)
cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins_env and cors_origins_env != "*":
    origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
else:
    # Explicit localhost origins for dev
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(cameras_router)
app.include_router(detections_router)
app.include_router(events_router)
app.include_router(alerts_router)
app.include_router(tracking_router)
app.include_router(anpr_router)
app.include_router(face_router)
app.include_router(streams_router)
app.include_router(evidence_router)
app.include_router(system_router)
app.include_router(users_router)
app.include_router(audit_router)
app.include_router(demo_router)
app.include_router(pipeline_router)
app.include_router(testing_router)


# -------------------------------------------------------------
# Health & Diagnostic Endpoints
# -------------------------------------------------------------
@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Returns platform diagnostics, uptime, and database connector status.
    """
    uptime = round(time.time() - START_TIME, 2)
    now_str = datetime.now(timezone.utc).isoformat()
    return HealthResponse(
        status="healthy",
        platform="IBVAP",
        version="1.0.0",
        environment=os.getenv("ENVIRONMENT", "production"),
        uptime_seconds=uptime,
        supabase_connected=supabase_service.is_connected,
        inference_engine="YOLOv8 + ByteTrack + FaceNet + PaddleOCR",
        active_websocket_clients=len(manager.active_connections),
        timestamp=now_str
    )


@app.get("/", tags=["Root"])
async def root():
    return {
        "platform": "IBVAP — Intelligent Border Video Analytics Platform",
        "service": "FastAPI AI Backend & CCTV Ingestion Pipeline",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/api/health",
        "streams_health": "/api/streams/health",
        "websocket_endpoint": "/ws/live/{camera_id}"
    }


# -------------------------------------------------------------
# Real-Time WebSocket Streaming Endpoints
# -------------------------------------------------------------
@app.websocket("/ws/live/{camera_id}")
async def websocket_camera_stream(
    websocket: WebSocket,
    camera_id: str = Path(..., description="Target Camera Identifier e.g. BOP-001")
):
    """
    Direct WebSocket streaming channel for an individual CCTV camera.
    Receives real-time AI metadata (track bounding boxes, face identity, ANPR, and triggered events).
    """
    await websocket.accept()
    stream_manager.register_client(camera_id, websocket)

    try:
        # Keep connection open and stream simulated fallback if stream worker is not yet started
        while True:
            worker = stream_manager._workers.get(camera_id)
            if not worker or not worker.is_running:
                # Provide smooth live bounding boxes until worker starts
                sim_item = detection_service.generate_simulated_detection(camera_id=camera_id)
                msg = {
                    "camera_id": camera_id,
                    "frame_timestamp": datetime.now(timezone.utc).isoformat(),
                    "detections": [
                        {
                            "track_id": int(sim_item.track_id.replace("P-", "").replace("V-", "")),
                            "object_type": sim_item.object_type,
                            "confidence": sim_item.confidence,
                            "bbox": sim_item.bbox,
                            "identity": sim_item.identity,
                            "friendly": sim_item.friendly
                        }
                    ],
                    "events": []
                }
                await websocket.send_json(msg)
                await asyncio.sleep(0.35)
            else:
                # Worker is actively broadcasting via stream_manager._on_worker_telemetry
                await asyncio.sleep(1.0)

    except WebSocketDisconnect:
        stream_manager.unregister_client(camera_id, websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error on camera {camera_id}: {e}")
        stream_manager.unregister_client(camera_id, websocket)


@app.websocket("/ws/live")
async def websocket_live_surveillance(
    websocket: WebSocket,
    camera_id: str = Query(None, description="Optional filter by camera ID e.g. BOP-001")
):
    """
    Legacy global WebSocket endpoint streaming detection items.
    """
    target_cam = camera_id or "BOP-001"
    await manager.connect(websocket)
    try:
        while True:
            detection = detection_service.generate_simulated_detection(camera_id=target_cam)
            await websocket.send_json(detection.model_dump())
            await asyncio.sleep(0.35)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket streaming error: {e}")
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
