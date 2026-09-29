import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Query, Depends

from services.system_monitor import system_monitor
from streaming.stream_manager import stream_manager

logger = logging.getLogger("ibvap.api.system")

router = APIRouter(prefix="/api/system", tags=["System Health & Metrics"])


@router.get("/health", summary="Get System Health and GPU Metrics")
async def get_system_health():
    """
    Returns platform health, CPU, memory, GPU telemetry, and stream counts.
    Supports graceful fallback if GPU is unavailable or on CPU-only hosts.
    """
    fleet_health = stream_manager.get_health()
    active_cams = fleet_health.get("active_cameras", 0)
    health_data = system_monitor.get_system_health(active_cameras=active_cams)
    return health_data


@router.get("/metrics", summary="Get Granular Performance & Latency Metrics")
async def get_system_metrics():
    """
    Returns detailed pipeline component latencies (YOLO, ByteTrack, Face, ANPR, Events),
    throughput FPS, frame counters, and camera fleet load breakdown.
    """
    fleet_health = stream_manager.get_health()
    active_cams = fleet_health.get("active_cameras", 0)
    cameras = fleet_health.get("cameras", [])
    metrics_data = system_monitor.get_performance_metrics(
        active_cameras=active_cams,
        camera_details=cameras
    )
    return metrics_data
