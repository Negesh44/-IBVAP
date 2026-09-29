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


class YOLODetectionItem(BaseModel):
    """
    Object detection output schema.
    """
    class_id: int = Field(..., description="Target class ID: 0=person, 1=car, 2=truck, 3=bus, 4=motorcycle")
    object_type: str = Field(..., description="Class name: person, car, truck, bus, motorcycle")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence score")
    bbox: List[int] = Field(..., min_length=4, max_length=4, description="Bounding box coordinates [x1, y1, x2, y2]")


class TrackedItem(BaseModel):
    """
    ByteTrack tracked object output schema with persistent track ID.
    """
    track_id: int = Field(..., description="Persistent multi-object tracking ID assigned by ByteTrack")
    class_id: int = Field(..., description="Target class ID: 0=person, 1=car, 2=truck, 3=bus, 4=motorcycle")
    object_type: str = Field(..., description="Class name: person, car, truck, bus, motorcycle")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score")
    bbox: List[int] = Field(..., min_length=4, max_length=4, description="Tracked bounding box coordinates [x1, y1, x2, y2]")


class DetectImageResponse(BaseModel):
    """
    Response schema for POST /api/detect endpoint.
    """
    detections: List[YOLODetectionItem] = Field(..., description="List of detected objects in frame")
    inference_time_ms: float = Field(..., description="Inference latency in milliseconds")
    image_width: int = Field(..., description="Image width in pixels")
    image_height: int = Field(..., description="Image height in pixels")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")


class TrackResponse(BaseModel):
    """
    Response schema for POST /api/track endpoint.
    """
    detections: List[YOLODetectionItem] = Field(..., description="Raw YOLO detections")
    tracking: List[TrackedItem] = Field(..., description="Persistent ByteTrack multi-object tracks")
    inference_time_ms: float = Field(..., description="YOLO inference latency in ms")
    tracking_time_ms: float = Field(..., description="ByteTrack association latency in ms")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")


class ANPRResponse(BaseModel):
    """
    Response schema for POST /api/anpr endpoint.
    """
    vehicle_type: Optional[str] = Field(None, description="Type of detected vehicle (car, truck, bus, motorcycle)")
    vehicle_confidence: float = Field(..., description="Confidence score of vehicle detection")
    plate_text: Optional[str] = Field(None, description="Extracted license plate string normalized to uppercase alphanumeric")
    plate_confidence: float = Field(..., description="Confidence score of license plate detection and OCR extraction")
    plate_bbox: Optional[List[int]] = Field(None, description="Bounding box of the license plate [x1, y1, x2, y2]")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")


class FaceRecognitionResponse(BaseModel):
    """
    Response schema for POST /api/face/recognize endpoint.
    """
    face_detected: bool = Field(..., description="True if a human face was found in the frame")
    identity: Optional[str] = Field(None, description="Name of verified Friendly Person, or null if unknown")
    person_id: Optional[str] = Field(None, description="Unique identifier of matched Friendly Person")
    friendly: bool = Field(False, description="True if recognized identity is an authorized Friendly Person")
    match_confidence: float = Field(0.0, description="Biometric match confidence score (0.0 to 1.0)")
    bbox: Optional[List[int]] = Field(None, description="Bounding box of detected face [x1, y1, x2, y2]")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")


class FaceRegisterResponse(BaseModel):
    """
    Response schema for POST /api/face/register/{person_id} endpoint.
    """
    person_id: str
    name: str
    face_registered: bool
    embedding_dimensions: int
    status: str
    message: str


class SecurityEventItem(BaseModel):
    """
    Event item emitted by the IBVAP Event Detection Engine.
    """
    event_id: str = Field(..., description="Unique event identifier e.g. EVT-INT-1A2B3C4D")
    camera_id: str = Field(..., description="Camera identifier, e.g. BOP-001")
    track_id: int = Field(..., description="ByteTrack tracked object ID")
    event_type: str = Field(..., description="INTRUSION, LOITERING, NIGHT_MOVEMENT, STATIONARY_PERSON")
    severity: str = Field(..., description="CRITICAL, WARNING, INFO")
    confidence: float = Field(..., description="Detection confidence score")
    description: str = Field(..., description="Descriptive narrative of event")
    bbox: List[int] = Field(..., min_length=4, max_length=4, description="Bounding box [x1, y1, x2, y2]")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Contextual rule telemetry")


class AnalyzeEventsRequest(BaseModel):
    """
    Input schema for POST /api/events/analyze.
    """
    camera_id: str = Field(..., description="Camera identifier e.g. BOP-001")
    frame_width: Optional[int] = Field(1920, description="CCTV frame width in pixels")
    frame_height: Optional[int] = Field(1080, description="CCTV frame height in pixels")
    brightness: Optional[float] = Field(None, description="Average frame luminance (0-255)")
    detections: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Raw YOLO detections")
    tracks: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="ByteTrack tracked items")


class AnalyzeEventsResponse(BaseModel):
    """
    Output schema for POST /api/events/analyze.
    """
    camera_id: str
    events_count: int
    events: List[SecurityEventItem]
    timestamp: str


class VirtualFenceConfig(BaseModel):
    """
    Virtual fence polygon configuration for a camera.
    """
    camera_id: str = Field(..., description="Target camera identifier")
    zone: List[List[float]] = Field(..., min_length=3, description="List of [x, y] polygon vertices")



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
