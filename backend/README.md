# IBVAP — Intelligent Border Video Analytics Platform
## Python FastAPI AI Backend, YOLO Inference, ByteTrack Tracking & ANPR Layer

This service provides the AI vision, multi-object tracking, and Automatic Number Plate Recognition (ANPR) layer for IBVAP, exposing REST endpoints for camera telemetry, alert triage, direct YOLO object detection, ByteTrack-based tracking, and PaddleOCR license plate extraction, alongside a live WebSocket streaming channel for real-time tracking feeds.

---

### Module Architecture

```
backend/
├── main.py                     # FastAPI application, CORS, routers & WebSocket /ws/live
├── requirements.txt            # Python dependencies (FastAPI, Ultralytics, PyTorch, PaddleOCR, Supabase)
├── .env                        # Environment configuration, YOLO, ByteTrack & ANPR hyperparameters
├── test_detect_api.py          # Standalone test client for /api/detect
├── test_tracking_api.py        # Standalone test client for ByteTrack persistence
├── test_anpr_api.py            # Standalone test client for /api/anpr
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
│   ├── ocr_engine.py           # CCTV image preprocessing & PaddleOCR text normalizer
│   └── anpr_service.py         # End-to-end ANPR pipeline & Supabase event hooks
├── services/
│   ├── __init__.py
│   ├── inference_service.py    # Coordinates image decoding, detection & latency metrics
│   ├── detection_service.py    # Simulated live detection engine (ByteTrack-ready)
│   ├── supabase_service.py     # Supabase queries & in-memory tactical fallback
│   └── event_service.py        # Threat evaluation & alert dispatch
├── api/
│   ├── __init__.py
│   ├── anpr.py                 # POST /api/anpr
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

### ANPR Pipeline & Capabilities

1. **Vehicle Detection**: Uses YOLO to detect vehicle classes (`car`, `truck`, `bus`, `motorcycle`).
2. **License Plate Detection**:
   - Modular integration configured via `ANPR_MODEL_PATH` environment variable.
   - If no dedicated plate model is provided, utilizes heuristic vehicle-relative ROI extraction.
3. **CCTV Image Preprocessing**:
   - Grayscale conversion
   - Resolution upscaling & normalization
   - Contrast enhancement (CLAHE)
   - Noise smoothing (Gaussian/Bilateral)
   - Edge sharpening
4. **PaddleOCR Text Extraction**:
   - Extracts character sequences and applies uppercase alphanumeric normalization (`TN09AB1234`).
5. **Non-Intrusive Error Handling**:
   - Empty/no-vehicle frames or unreadable plates return empty results gracefully instead of crashing.
   - Unreadable plates are **not** treated as suspicious automatically.

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
```

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

> **PaddlePaddle Installation Note:** For CPU-only environments, `pip install paddlepaddle paddleocr` is used. For CUDA GPU accelerated environments, refer to [PaddlePaddle GPU documentation](https://www.paddlepaddle.org.cn/install/quick).

#### 4. Start the FastAPI Server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Or directly:
```bash
python main.py
```

---

### Available Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Diagnostics, uptime, and connector status |
| `GET` | `/api/cameras` | List cameras from Supabase |
| `GET` | `/api/events` | Security and recognition event logs |
| `GET` | `/api/alerts` | Active and historical perimeter alerts |
| `POST` | `/api/detect` | Direct YOLO object detection on image frame |
| `POST` | `/api/track` | YOLO + ByteTrack multi-object tracking |
| `POST` | `/api/track/reset/{id}` | Reset tracking state for specific camera |
| `POST` | `/api/anpr` | Vehicle detection + license plate OCR |
| `WS` | `/ws/live` | Real-time WebSocket streaming bounding boxes |

---

### Testing the ANPR Endpoint (`POST /api/anpr`)

#### Using `curl`:
```bash
curl -X POST "http://localhost:8000/api/anpr?confidence=0.40" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@vehicle_cctv_frame.jpg"
```

#### Expected JSON Output:
```json
{
  "vehicle_type": "car",
  "vehicle_confidence": 0.94,
  "plate_text": "TN09AB1234",
  "plate_confidence": 0.91,
  "plate_bbox": [120, 180, 300, 230],
  "timestamp": "2026-09-29T12:00:00.000Z"
}
```

#### Running the automated ANPR test client:
```bash
python test_anpr_api.py
```
