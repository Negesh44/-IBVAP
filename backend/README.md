# IBVAP — Intelligent Border Video Analytics Platform
## Python FastAPI AI Backend & YOLO Inference Layer

This service provides the AI inference layer for IBVAP, exposing REST endpoints for camera telemetry, alert triage, and direct YOLO object detection inference on image frames, alongside a live WebSocket streaming channel for real-time tracking feeds.

---

### Module Architecture

```
backend/
├── main.py                     # FastAPI application, CORS, routers & WebSocket /ws/live
├── requirements.txt            # Python dependencies (FastAPI, Ultralytics, PyTorch, Supabase)
├── .env                        # Environment configuration & YOLO hyperparameters
├── test_detect_api.py          # Standalone test client for /api/detect
├── ai/
│   ├── __init__.py
│   ├── model_loader.py         # Lazy YOLO model loader with automatic CUDA / CPU allocation
│   └── detector.py             # 5-class detector and reusable detect_frame() function
├── services/
│   ├── __init__.py
│   ├── inference_service.py    # Coordinates image decoding, detection & latency metrics
│   ├── detection_service.py    # Simulated live detection engine (ByteTrack-ready)
│   ├── supabase_service.py     # Supabase queries & in-memory tactical fallback
│   └── event_service.py        # Threat evaluation & alert dispatch
├── api/
│   ├── __init__.py
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

The detector is configured for 5 primary tactical classes:

| Class ID | Target Class | Description |
|---|---|---|
| `0` | `person` | Border perimeter humanoid subjects / intruders |
| `1` | `car` | Light motor vehicles / sedans / SUVs |
| `2` | `truck` | Heavy transport / cargo / military trucks |
| `3` | `bus` | Passenger buses / transport carriers |
| `4` | `motorcycle` | Two-wheelers / motorbikes / ATVs |

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

#### 4. Configure YOLO Model Path & Confidence (`.env`):
Edit `backend/.env` or export environment variables:
```bash
# Set path to your trained .pt weights file (relative to backend/ or absolute path):
export YOLO_MODEL_PATH="weights/best.pt"

# Set minimum confidence threshold (default: 0.40):
export YOLO_CONFIDENCE=0.40
```

On Windows (PowerShell):
```powershell
$env:YOLO_MODEL_PATH="weights/best.pt"
$env:YOLO_CONFIDENCE="0.40"
```

> **Hardware Acceleration:** The detector automatically detects if an NVIDIA CUDA GPU is available (`torch.cuda.is_available()`) and allocates inference to `cuda:0`. If no GPU is present, it seamlessly falls back to CPU execution without manual configuration.

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

### Testing the YOLO Inference Endpoint (`POST /api/detect`)

#### Option A: Using `curl`

Upload an image file (`frame.jpg`) to test object detection:

```bash
curl -X POST "http://localhost:8000/api/detect?confidence=0.40" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@path/to/your/image.jpg"
```

#### Option B: Using Python `requests`

Run the included automated test client:
```bash
python test_detect_api.py
```

#### Example JSON Response:
```json
{
  "detections": [
    {
      "class_id": 0,
      "object_type": "person",
      "confidence": 0.94,
      "bbox": [120, 180, 280, 520]
    },
    {
      "class_id": 1,
      "object_type": "car",
      "confidence": 0.88,
      "bbox": [340, 210, 620, 480]
    }
  ],
  "inference_time_ms": 16.8,
  "image_width": 1920,
  "image_height": 1080,
  "timestamp": "2026-09-29T08:00:00.000Z"
}
```

---

### Reusable Function Usage

In Python scripts, you can directly import and use `detect_frame()`:

```python
from ai.detector import detect_frame
from PIL import Image

image = Image.open("sample_border_frame.jpg")
detections = detect_frame(image, conf_threshold=0.45)

for det in detections:
    print(f"Detected {det['object_type']} ({det['confidence'] * 100}%) at bbox {det['bbox']}")
```

---

### Notes on Upcoming Pipeline Modules

- **ByteTrack Multi-Object Tracking**: Will wrap `detect_frame()` to assign persistent track IDs (`P-104`, `V-021`) across consecutive video frames.
- **Biometric Face Recognition**: 512-dimensional embedding comparison against the `friendly_persons` dossier.
- **ANPR (License Plate Recognition)**: OCR character recognition on detected vehicle bounding boxes.
- **Spatial Tripwire & Virtual Fence**: Vector containment and perimeter breach classification.
