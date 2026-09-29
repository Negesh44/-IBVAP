import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Query, Depends

from services.system_monitor import system_monitor
from streaming.stream_manager import stream_manager
from auth.dependencies import get_current_user, CurrentUser

logger = logging.getLogger("ibvap.api.system")

router = APIRouter(prefix="/api/system", tags=["System Health & Metrics"])


@router.get("/health", summary="Get System Health and GPU Metrics")
async def get_system_health(current_user: CurrentUser = Depends(get_current_user)):
    """
    Returns platform health, CPU, memory, GPU telemetry, and stream counts.
    Role-based visibility:
    - ADMIN / COMMANDER / OPERATOR: Full hardware metrics
    - VIEWER: Basic system status
    """
    fleet_health = stream_manager.get_health()
    active_cams = fleet_health.get("active_cameras", 0)
    health_data = system_monitor.get_system_health(active_cameras=active_cams)

    # Basic masking for VIEWER role
    if current_user.role == "VIEWER":
        return {
            "status": health_data.get("status"),
            "uptime_seconds": health_data.get("uptime_seconds"),
            "active_cameras": health_data.get("active_cameras"),
            "processing_fps": health_data.get("processing_fps"),
            "gpu_available": health_data.get("gpu_available")
        }

    return health_data


@router.get("/metrics", summary="Get Granular Performance & Latency Metrics")
async def get_system_metrics(current_user: CurrentUser = Depends(get_current_user)):
    """
    Returns detailed pipeline component latencies (YOLO, ByteTrack, Face, ANPR, Events),
    throughput FPS, frame counters, and camera fleet load breakdown.
    Requires authenticated role (ADMIN/COMMANDER see full details; OPERATOR operational).
    """
    fleet_health = stream_manager.get_health()
    active_cams = fleet_health.get("active_cameras", 0)
    cameras = fleet_health.get("cameras", [])
    metrics_data = system_monitor.get_performance_metrics(
        active_cameras=active_cams,
        camera_details=cameras
    )
    return metrics_data
