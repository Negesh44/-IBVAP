import os
import time
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Set
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

# Internal Imports
from models.schemas import HealthResponse, DetectionItem
from services.supabase_service import supabase_service
from services.detection_service import detection_service
from api.cameras import router as cameras_router
from api.detections import router as detections_router
from api.events import router as events_router
from api.alerts import router as alerts_router
from api.tracking import router as tracking_router

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ibvap.backend")

START_TIME = time.time()

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

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
    logger.info("Starting IBVAP Backend Integration Layer...")
    logger.info(f"Supabase Gateway Status: {'CONNECTED' if supabase_service.is_connected else 'LOCAL FALLBACK'}")
    yield
    logger.info("Shutting down IBVAP Backend Service.")


app = FastAPI(
    title="IBVAP Backend API",
    description="Intelligent Border Video Analytics Platform — FastAPI Backend Integration Layer for YOLOv8 & ByteTrack Feeds",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Setup
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
origins = [o.strip() for o in cors_origins_env.split(",")] if cors_origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(cameras_router)
app.include_router(detections_router)
app.include_router(events_router)
app.include_router(alerts_router)
app.include_router(tracking_router)


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
        inference_engine="YOLOv8 + ByteTrack (Simulation Ready)",
        active_websocket_clients=len(manager.active_connections),
        timestamp=now_str
    )


@app.get("/", tags=["Root"])
async def root():
    return {
        "platform": "IBVAP — Intelligent Border Video Analytics Platform",
        "service": "FastAPI AI Backend Integration Layer",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/api/health",
        "websocket_endpoint": "/ws/live"
    }


# -------------------------------------------------------------
# Real-Time WebSocket Streaming Endpoint
# -------------------------------------------------------------
@app.websocket("/ws/live")
async def websocket_live_surveillance(
    websocket: WebSocket,
    camera_id: str = Query(None, description="Optional filter by camera ID e.g. BOP-001")
):
    """
    WebSocket endpoint streaming live detection bounding boxes and track telemetry.
    The React Live Surveillance page connects to this endpoint to receive detection items
    formatted identically to future real-time YOLOv8 inference outputs.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Generate simulated detection item
            detection = detection_service.generate_simulated_detection(camera_id=camera_id)
            
            # Send detection payload over WebSocket
            await websocket.send_json(detection.model_dump())
            
            # Stream interval (e.g. 200ms - 400ms for smooth live bounding boxes)
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
