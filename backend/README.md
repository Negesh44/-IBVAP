# IBVAP — Intelligent Border Video Analytics Platform
## Python FastAPI AI Backend, YOLO Inference & ByteTrack Tracking Layer

This service provides the AI vision and multi-object tracking layer for IBVAP, exposing REST endpoints for camera telemetry, alert triage, direct YOLO object detection, and ByteTrack-based persistent multi-object tracking, alongside a live WebSocket streaming channel for real-time tracking feeds.

---

### Module Architecture

```
backend/
├── main.py                     # FastAPI application, CORS, routers & WebSocket /ws/live
├── requirements.txt            # Python dependencies (FastAPI, Ultralytics, PyTorch, Supabase)
├── .env                        # Environment configuration, YOLO & ByteTrack hyperparameters
├── test_detect_api.py          # Standalone test client for /api/detect
├── test_tracking_api.py        # Standalone test client for ByteTrack persistence
├── ai/
│   ├── __init__.py
│   ├── model_loader.py         # Lazy YOLO model loader with automatic CUDA / CPU allocation
│   └── detector.py             # 5-class detector and reusable detect_frame() function
├── tracking/
│   ├── __init__.py
│   ├── bytetrack_tracker.py    # ByteTrack Kalman filter & dual-stage IoU association
│   └── tracker_service.py      # Multi-camera isolated tracker instances & downstream hooks
├── services/
│   ├── __init__.py
│   ├── inference_service.py    # Coordinates image decoding, detection & latency metrics
│   ├── detection_service.py    # Simulated live detection engine (ByteTrack-ready)
│   ├── supabase_service.py     # Supabase queries & in-memory tactical fallback
│   └── event_service.py        # Threat evaluation & alert dispatch
├── api/
│   ├── __init__.py
│   ├── tracking.py             # POST /api/track & POST /api/track/reset/{camera_id}
│   ├── detections.py           # POST /api/detect & GET /api/detections
│   ├── cameras.py              # GET /api/cameras & GET /api/cameras/{id}
│   ├── events.py               # GET /api/events
│   └── alerts.py               # GET /api/alerts & POST alert status updates
└── models/
    ├── __init__.py
    └── schemas.py              # Pydantic data validation schemas
```

---

### Supported Target Classes

The detector and tracker track 5 primary tactical classes:

| Class ID | Target Class | Description |
|---|---|---|
| `0` | `person` | Border perimeter humanoid subjects / intruders |
| `1` | `car` | Light motor vehicles / sedans / SUVs |
| `2` | `truck` | Heavy transport / cargo / military trucks |
| `3` | `bus` | Passenger buses / transport carriers |
| `4` | `motorcycle` | Two-wheelers / motorbikes / ATVs |

---

### ByteTrack Tracking Parameters (`.env`)

Configure tracking hyperparameters via environment variables:

| Parameter | Default | Description |
|---|---|---|
| `TRACKER_TRACK_THRESH` | `0.40` | Detection confidence threshold for primary track association |
| `TRACKER_TRACK_BUFFER` | `30` | Number of frames to keep lost tracks before deletion |
| `TRACKER_MATCH_THRESH` | `0.80` | IoU match threshold for high-confidence association |

---

### Quick Start & Installation

#### 1. Navigate to the backend directory:
```bash
cd backend
```

#### 2. Create and activate a Python Virtual Environment:

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install required packages:
```bash
pip install -r requirements.txt
```

#### 4. Configure YOLO & Tracker Settings (`.env`):
Edit `backend/.env` or export environment variables:
```bash
# Set path to your trained .pt weights file:
export YOLO_MODEL_PATH="weights/best.pt"
export YOLO_CONFIDENCE=0.40

# Tracker settings:
export TRACKER_TRACK_THRESH=0.40
export TRACKER_TRACK_BUFFER=30
export TRACKER_MATCH_THRESH=0.80
```

#### 5. Start the FastAPI Server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Or directly:
```bash
python main.py
```

The server will be available at:
- **API Base:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`
- **Health Status:** `http://localhost:8000/api/health`

---

### Testing the Endpoints

#### 1. Multi-Object Tracking Endpoint (`POST /api/track`)

**Using `curl`:**
```bash
curl -X POST "http://localhost:8000/api/track?camera_id=BOP-001&confidence=0.40" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@sample_border_frame.jpg"
```

**Response Format:**
```json
{
  "detections": [
    {
      "class_id": 0,
      "object_type": "person",
      "confidence": 0.94,
      "bbox": [120, 180, 280, 520]
    }
  ],
  "tracking": [
    {
      "track_id": 104,
      "class_id": 0,
      "object_type": "person",
      "confidence": 0.94,
      "bbox": [120, 180, 280, 520]
    }
  ],
  "inference_time_ms": 16.4,
  "tracking_time_ms": 1.2,
  "timestamp": "2026-09-29T12:00:00.000Z"
}
```

#### 2. Reset Camera Tracking State (`POST /api/track/reset/{camera_id}`)
```bash
curl -X POST "http://localhost:8000/api/track/reset/BOP-001"
```

#### 3. Run Automated Frame-to-Frame Persistence Verification:
```bash
python test_tracking_api.py
```

---

### Downstream Pipeline Integration Hooks

The `TrackerService` in [`tracking/tracker_service.py`](./tracking/tracker_service.py) outputs stable `track_id` objects that will feed future analytics modules:
1. **Virtual Fence / Spatial Tripwire**: Evaluates whether a track ID's trajectory crosses restricted polygon boundaries.
2. **Loitering Detection**: Calculates dwell time for persistent track IDs in sensitive zones.
3. **Face Biometrics & ANPR**: Attaches recognized identities/plates to persistent object IDs without needing re-identification on every single frame.
