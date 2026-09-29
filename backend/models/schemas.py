from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime


class DetectionItem(BaseModel):
    """
    Standard detection schema emitted by YOLO inference engine and simulated WebSocket.
    """
    camera_id: str = Field(..., description="Camera identifier, e.g. BOP-001")
    track_id: str = Field(..., description="Unique ByteTrack ID, e.g. P-104 or V-021")
    object_type: str = Field(..., description="Object category: person, vehicle, etc.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score (0.0 to 1.0)")
    bbox: List[int] = Field(..., min_length=4, max_length=4, description="Bounding box [x1, y1, x2, y2]")
    identity: Optional[str] = Field(None, description="Identified person name if friendly match, or license plate")
    friendly: bool = Field(False, description="True if verified in friendly_persons whitelist")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")


class CameraSchema(BaseModel):
    id: str
    camera_code: Optional[str] = None
    name: str
    location: Optional[str] = None
    rtsp_url: Optional[str] = None
    status: str = "ONLINE"
    resolution: Optional[str] = "1920x1080 (1080p)"
    fps: int = 30
    created_at: Optional[str] = None


class EventSchema(BaseModel):
    id: str
    event_type: str
    object_type: Optional[str] = None
    confidence: Optional[float] = None
    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    location: Optional[str] = None
    severity: str = "INFO"
    evidence_url: Optional[str] = None
    timestamp: str


class AlertSchema(BaseModel):
    id: str
    alert_type: str
    severity: str = "CRITICAL"
    camera_id: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: str = "ACTIVE"
    evidence_url: Optional[str] = None
    detected_at: Optional[str] = None
    created_at: Optional[str] = None


class AlertActionRequest(BaseModel):
    status: str = Field(..., description="ACKNOWLEDGED or RESOLVED")
    operator_name: Optional[str] = "Command Operator"
    note: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    platform: str = "IBVAP"
    version: str = "1.0.0"
    environment: str
    uptime_seconds: float
    supabase_connected: bool
    inference_engine: str
    active_websocket_clients: int
    timestamp: str
