# IBVAP — Intelligent Border Video Analytics Platform
## Python FastAPI AI Backend: YOLO Detection, ByteTrack Tracking, ANPR, Face Recognition & Event Detection Engine

This service provides the core AI vision, multi-object tracking, Automatic Number Plate Recognition (ANPR), Biometric Face Matching, and Real-time Event Detection Engine for IBVAP.

---

### Module Architecture

```
backend/
├── main.py                     # FastAPI application, CORS, routers & WebSocket /ws/live
├── requirements.txt            # Python dependencies (FastAPI, Ultralytics, PyTorch, PaddleOCR, Facenet-PyTorch, Supabase)
├── .env                        # Environment configuration, Vision hyperparameters & Event rule thresholds
├── test_detect_api.py          # Standalone test client for /api/detect
├── test_tracking_api.py        # Standalone test client for ByteTrack persistence
├── test_anpr_api.py            # Standalone test client for /api/anpr
├── test_face_api.py            # Standalone test client for /api/face/recognize & register
├── test_event_engine.py        # Comprehensive test suite for Event Detection Engine rules
├── migrations/
│   └── 01_face_embeddings.sql  # Supabase schema migration for face_embeddings with RLS
├── ai/
│   ├── __init__.py
│   ├── model_loader.py         # Lazy YOLO model loader with automatic CUDA / CPU allocation
│   └── detector.py             # 5-class detector and reusable detect_frame() function
├── tracking/
│   ├── __init__.py
│   ├── bytetrack_tracker.py    # ByteTrack Kalman filter & dual-stage IoU association
│   └── tracker_service.py      # Multi-camera isolated tracker instances & downstream hooks
├── anpr/
│   ├── __init__.py
│   ├── plate_detector.py       # Modular plate detector (ANPR_MODEL_PATH + vehicle ROI fallback)
│   └── ocr_engine.py           # CCTV image preprocessing & PaddleOCR text normalizer
├── face/
│   ├── __init__.py
│   ├── face_detector.py        # Pretrained MTCNN face detector + ROI extraction
│   ├── face_embedding.py       # InceptionResnetV1 512-D L2-normalized vector extractor
│   ├── face_matcher.py         # Biometric cosine matcher against Friendly Persons whitelist
│   └── face_service.py         # End-to-end recognition pipeline & enrollment service
├── events/
│   ├── __init__.py
│   ├── event_rules.py          # Rule thresholds, severities, and debounce cooldown tracker
│   ├── virtual_fence.py        # Multi-camera spatial polygon zones & intrusion state transitions
│   ├── loitering.py            # Dwell duration and stationary behavior tracking
│   ├── night_detection.py      # Ambient frame luminance evaluator & night movement rules
│   └── event_engine.py         # Master Event Engine integrating YOLO, ByteTrack, & Supabase sync
├── services/
│   ├── __init__.py
│   ├── inference_service.py    # Coordinates image decoding, detection & latency metrics
│   ├── detection_service.py    # Simulated live detection engine (ByteTrack-ready)
│   ├── supabase_service.py     # Supabase queries & in-memory tactical fallback
│   └── event_service.py        # Legacy event dispatch helper
├── api/
│   ├── __init__.py
│   ├── events.py               # POST /api/events/analyze, POST /api/events/fence, GET /api/events
│   ├── face.py                 # POST /api/face/recognize & POST /api/face/register/{id}
│   ├── anpr.py                 # POST /api/anpr
│   ├── tracking.py             # POST /api/track & POST /api/track/reset/{camera_id}
│   ├── detections.py           # POST /api/detect & GET /api/detections
│   ├── cameras.py              # GET /api/cameras & GET /api/cameras/{id}
│   └── alerts.py               # GET /api/alerts & POST alert status updates
└── models/
    ├── __init__.py
    └── schemas.py              # Pydantic data validation schemas
```

---

### Event Detection Engine & Security Rules

The Event Detection Engine analyzes real-time detections and tracks to identify security-relevant occurrences without generating false frame-by-frame alert storms:

1. **Virtual Fence / Intrusion Detection (`INTRUSION` - `CRITICAL`)**:
   - Each camera supports a custom polygon boundary `[[x1, y1], [x2, y2], ...]`.
   - Uses Ray-Casting Point-in-Polygon testing on target ground-contact points.
   - Detects state transitions (`ENTERED`, `INSIDE`, `LEFT`).
2. **Loitering Detection (`LOITERING` - `WARNING`)**:
   - Measures continuous dwell time within restricted or general camera FOVs.
   - Configurable trigger threshold: `LOITERING_THRESHOLD_SECONDS=30`.
3. **Night Movement Detection (`NIGHT_MOVEMENT` - `WARNING`)**:
   - Evaluates frame luminance against `NIGHT_BRIGHTNESS_THRESHOLD=50`.
   - Generates non-hostile situational warnings for operators.
4. **Stationary Person Behavior (`STATIONARY_PERSON` - `INFO`)**:
   - Flags targets that remain still within spatial displacement threshold (`STATIONARY_DISPLACEMENT_PX=30`) for `STATIONARY_THRESHOLD_SECONDS=60`.
5. **Debounce & Cooldown Engine**:
   - Cooldown period (`EVENT_COOLDOWN_SECONDS=30`) keyed by `(camera_id, track_id, event_type)` ensures operators are not flooded with duplicate alerts every frame.
6. **Supabase Event & Alert Persistence**:
   - Auto-syncs triggered events into the Supabase `events` table.
   - High-severity occurrences (`CRITICAL` & `WARNING`) generate actionable records in the `alerts` table for human operator review.
   - No autonomous aggressive actions are taken.

---

### Configurable Environment Variables (`.env`)

```env
# YOLO Object Detection
YOLO_MODEL_PATH=weights/best.pt
YOLO_CONFIDENCE=0.40

# ByteTrack Multi-Object Tracker
TRACKER_TRACK_THRESH=0.40
TRACKER_TRACK_BUFFER=30
TRACKER_MATCH_THRESH=0.80

# ANPR (Automatic Number Plate Recognition)
ANPR_MODEL_PATH=
ANPR_CONFIDENCE=0.40
OCR_CONFIDENCE=0.50

# Biometric Face Recognition
FACE_MODEL_PATH=
FACE_MATCH_THRESHOLD=0.45
FACE_DETECTION_CONFIDENCE=0.50

# Event Detection Engine & Rules
LOITERING_THRESHOLD_SECONDS=30
NIGHT_BRIGHTNESS_THRESHOLD=50
STATIONARY_THRESHOLD_SECONDS=60
STATIONARY_DISPLACEMENT_PX=30
EVENT_COOLDOWN_SECONDS=30

# Configurable Severities
SEVERITY_INTRUSION=CRITICAL
SEVERITY_LOITERING=WARNING
SEVERITY_NIGHT_MOVEMENT=WARNING
SEVERITY_STATIONARY_PERSON=INFO
```

---

### Available Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Diagnostics, uptime, and database status |
| `GET` | `/api/cameras` | List cameras from Supabase |
| `GET` | `/api/events` | List historical security events |
| `POST` | `/api/events/analyze` | Evaluate detections & tracks against security rules |
| `POST` | `/api/events/fence` | Configure spatial virtual fence polygon for a camera |
| `GET` | `/api/events/fence/{id}`| Retrieve active virtual fence polygon vertices |
| `GET` | `/api/alerts` | Active and historical perimeter alerts |
| `POST` | `/api/detect` | Direct YOLO object detection on image frame |
| `POST` | `/api/track` | YOLO + ByteTrack multi-object tracking |
| `POST` | `/api/track/reset/{id}` | Reset tracking state for specific camera |
| `POST` | `/api/anpr` | Vehicle detection + license plate OCR |
| `POST` | `/api/face/recognize` | Face detection + Friendly Person biometric match |
| `POST` | `/api/face/register/{id}` | Enroll personnel face into biometric database |
| `WS` | `/ws/live` | Real-time WebSocket streaming bounding boxes |

---

### Configuring a Virtual Fence & Testing

#### 1. Configure a Virtual Fence for Camera (`POST /api/events/fence`)
```bash
curl -X POST "http://localhost:8000/api/events/fence" \
     -H "Content-Type: application/json" \
     -d '{
       "camera_id": "BOP-001",
       "zone": [
         [100, 100],
         [500, 100],
         [500, 400],
         [100, 400]
       ]
     }'
```

#### 2. Analyze CCTV Frame Telemetry (`POST /api/events/analyze`)
```bash
curl -X POST "http://localhost:8000/api/events/analyze" \
     -H "Content-Type: application/json" \
     -d '{
       "camera_id": "BOP-001",
       "frame_width": 1920,
       "frame_height": 1080,
       "brightness": 35.0,
       "tracks": [
         {
           "track_id": 104,
           "object_type": "person",
           "confidence": 0.96,
           "bbox": [200, 150, 300, 350]
         }
       ]
     }'
```

#### Expected JSON Output:
```json
{
  "camera_id": "BOP-001",
  "events_count": 2,
  "events": [
    {
      "event_id": "EVT-INT-9F12A8B4",
      "camera_id": "BOP-001",
      "track_id": 104,
      "event_type": "INTRUSION",
      "severity": "CRITICAL",
      "confidence": 0.96,
      "description": "Person entered restricted virtual fence zone",
      "bbox": [200, 150, 300, 350],
      "timestamp": "2026-09-29T12:00:00.000Z",
      "metadata": {
        "rule": "VIRTUAL_FENCE_POLYGON",
        "state_transition": "ENTERED",
        "reference_point": [250.0, 350.0]
      }
    },
    {
      "event_id": "EVT-NGT-3B77E2A1",
      "camera_id": "BOP-001",
      "track_id": 104,
      "event_type": "NIGHT_MOVEMENT",
      "severity": "WARNING",
      "confidence": 0.96,
      "description": "Person movement detected during low-light/night conditions",
      "bbox": [200, 150, 300, 350],
      "timestamp": "2026-09-29T12:00:00.000Z",
      "metadata": {
        "rule": "LOW_LIGHT_AMBIENT_DETECTION",
        "frame_brightness": 35.0,
        "brightness_threshold": 50.0
      }
    }
  ],
  "timestamp": "2026-09-29T12:00:00.000Z"
}
```

#### 3. Running Unit & Integration Tests:
```bash
python test_event_engine.py
```
