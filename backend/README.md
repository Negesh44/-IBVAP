# IBVAP — Intelligent Border Video Analytics Platform
## Python FastAPI AI Backend: Real-Time CCTV Ingestion Pipeline, YOLO, ByteTrack, Face Recognition, ANPR & Event Engine

This service provides the complete AI vision, multi-object tracking, Automatic Number Plate Recognition (ANPR), Biometric Face Matching, Event Detection Engine, and real-time IP CCTV RTSP streaming pipeline for IBVAP.

---

### End-to-End Real-Time CCTV Pipeline

```
IP CCTV Camera (RTSP / ONVIF / MP4)
       │
       ▼
[ RTSPStreamCapture ] (OpenCV / FFmpeg with low-latency TCP buffer & auto-reconnection)
       │
       ▼
[ CameraWorker Thread ] (Per-camera worker, bounded frame queue, FPS rate limiter)
       │
       ▼
[ Unified Vision Pipeline ]
  ├─ 1. YOLOv8 Object Detection (person, car, truck, bus, motorcycle)
  ├─ 2. ByteTrack Multi-Object Tracking (persistent cross-frame track IDs)
  ├─ 3. Biometric Face Recognition (InceptionResnetV1 friendly matching)
  ├─ 4. ANPR (PaddleOCR license plate extraction)
  └─ 5. Event Engine (Virtual Fence Intrusion, Loitering, Night Movement, Stationary Behavior)
       │
       ├─► Supabase (Events & Alerts database tables)
       ├─► MJPEG Preview (GET /api/streams/{camera_id}/preview for local dev)
       └─► WebSocket Channel (/ws/live/{camera_id}) ──► React Live Surveillance Dashboard
```

---

### Module Architecture

```
backend/
├── main.py                     # FastAPI app, CORS, routers & WebSocket endpoints (/ws/live/{camera_id})
├── requirements.txt            # Python dependencies (FastAPI, OpenCV, Ultralytics, PyTorch, PaddleOCR, Supabase)
├── .env                        # Environment configuration, Vision & Streaming parameters
├── test_detect_api.py          # Standalone test client for /api/detect
├── test_tracking_api.py        # Standalone test client for ByteTrack persistence
├── test_anpr_api.py            # Standalone test client for /api/anpr
├── test_face_api.py            # Standalone test client for /api/face/recognize & register
├── test_event_engine.py        # Test suite for Event Detection Engine rules
├── test_streaming_pipeline.py  # Test suite for CCTV Ingestion & Real-Time Streaming
├── migrations/
│   └── 01_face_embeddings.sql  # Supabase schema migration for face_embeddings with RLS
├── streaming/
│   ├── __init__.py
│   ├── rtsp_manager.py         # RTSP stream capture, FPS rate control & auto-reconnection logic
│   ├── camera_worker.py        # Dedicated background worker thread per active camera
│   ├── frame_processor.py      # Unified AI vision chain (YOLO + ByteTrack + Face + ANPR + Events)
│   └── stream_manager.py       # Fleet coordinator managing camera workers & WebSocket broadcasts
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
│   ├── streams.py              # POST start/stop, GET status, health, and MJPEG preview
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

### Environment Variables (`backend/.env`)

```env
# Server Settings
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=*

# Supabase Credentials (Server-side Only)
SUPABASE_URL=https://tlpdoykzxpwzvhzypsqq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=sb_publishable_aezuXbrKhTWnvUMXo9L1oA_PIpWioCM

# AI Vision & YOLO Inference Settings
YOLO_MODEL_PATH=weights/best.pt
YOLO_CONFIDENCE=0.40

# ByteTrack Multi-Object Tracker Settings
TRACKER_TRACK_THRESH=0.40
TRACKER_TRACK_BUFFER=30
TRACKER_MATCH_THRESH=0.80

# ANPR Settings
ANPR_MODEL_PATH=
ANPR_CONFIDENCE=0.40
OCR_CONFIDENCE=0.50

# Biometric Face Recognition Settings
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

# CCTV Ingestion & Real-Time Processing Pipeline
PROCESS_FPS=5
RTSP_RECONNECT_INTERVAL=5
RTSP_MAX_RETRIES=10
STREAM_SOURCE_MODE=rtsp
TEST_VIDEO_PATH=sample_feed.mp4
```

---

### Quick Start & Installation

#### 1. Navigate to backend directory:
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

#### 3. Install required dependencies:
```bash
pip install -r requirements.txt
```

#### 4. Start the FastAPI Server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Or directly:
```bash
python main.py
```

---

### CCTV Stream Operation Modes

#### A. Running with a Local MP4 Video File (Development / Demo Mode)
To test without physical CCTV hardware:
1. Place a test video in `backend/sample_feed.mp4` (or specify in `.env`).
2. Update `.env`:
   ```env
   STREAM_SOURCE_MODE=video_file
   TEST_VIDEO_PATH=sample_feed.mp4
   ```
3. Start the stream:
   ```bash
   curl -X POST "http://localhost:8000/api/streams/start/BOP-001"
   ```

#### B. Running with an RTSP IP CCTV Camera
1. Update `.env`:
   ```env
   STREAM_SOURCE_MODE=rtsp
   ```
2. Start the camera with its RTSP stream URL:
   ```bash
   curl -X POST "http://localhost:8000/api/streams/start/BOP-001?rtsp_url=rtsp://admin:password@192.168.1.100:554/h264Preview_01_main"
   ```

#### C. Stopping a Camera Stream
```bash
curl -X POST "http://localhost:8000/api/streams/stop/BOP-001"
```

#### D. Checking Fleet Health & Active Streams
```bash
curl -X GET "http://localhost:8000/api/streams/health"
```

#### E. MJPEG Local Preview (Browser Inspection)
Open in browser for visual preview:
```
http://localhost:8000/api/streams/BOP-001/preview
```

---

### React WebSocket Connection

Connect to the camera-specific telemetry WebSocket channel from the React frontend:

```javascript
// React Live Surveillance WebSocket Hook Example:
const cameraCode = "BOP-001";
const wsUrl = `ws://localhost:8000/ws/live/${cameraCode}`;

const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log(`Connected to CCTV stream: ${cameraCode}`);
};

ws.onmessage = (event) => {
  const telemetry = JSON.parse(event.data);
  // telemetry: {
  //   camera_id: "BOP-001",
  //   frame_timestamp: "2026-09-29T12:00:00.000Z",
  //   detections: [
  //     {
  //       track_id: 104,
  //       object_type: "person",
  //       confidence: 0.96,
  //       bbox: [120, 180, 280, 520],
  //       identity: "Capt. Arjun Sharma",
  //       friendly: true
  //     }
  //   ],
  //   events: [...]
  // }
  setDetections(telemetry.detections);
  if (telemetry.events && telemetry.events.length > 0) {
    handleNewEvents(telemetry.events);
  }
};

ws.onclose = () => {
  console.log("WebSocket disconnected. Retrying...");
};
```

---

### Troubleshooting RTSP Connection Errors

1. **Camera OFFLINE / Connection Refused**:
   - Verify camera IP address and port: `ping <camera-ip>` or `telnet <camera-ip> 554`.
   - Ensure RTSP authentication credentials (username/password) are correct in the URL.
   - If using Wi-Fi cameras with packet loss, increase `RTSP_RECONNECT_INTERVAL=5` and `RTSP_MAX_RETRIES=15`.
2. **High Latency / Video Lag**:
   - `PROCESS_FPS` defaults to `5` frames per second to ensure AI inference keeps up with real-time video without frame buffer buildup.
   - Ensure OpenCV FFmpeg capture flags are set to TCP: `OPENCV_FFMPEG_CAPTURE_OPTIONS="rtsp_transport;tcp|fflags;nobuffer|max_delay;500000"`.
3. **ONVIF Discovery**:
   - RTSP URL configuration is the primary, deterministic method for connecting CCTV cameras. Explicit RTSP URLs can be set via `cameras` table in Supabase or overridden dynamically at `POST /api/streams/start/{camera_id}?rtsp_url=...`.

---

### Running Automated Test Suites

```bash
# Test Real-Time CCTV Ingestion Pipeline & Reconnection
python test_streaming_pipeline.py

# Test Event Detection Engine (Virtual Fence, Loitering, Night Movement)
python test_event_engine.py

# Test Biometric Face Recognition
python test_face_api.py

# Test Automatic Number Plate Recognition (ANPR)
python test_anpr_api.py

# Test YOLO Inference Endpoint
python test_detect_api.py

# Test ByteTrack Multi-Object Tracking Persistence
python test_tracking_api.py
```
