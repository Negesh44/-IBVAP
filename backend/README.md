# IBVAP — Intelligent Border Video Analytics Platform
## Python FastAPI AI Backend Integration Layer

This directory contains the Python FastAPI backend service that bridges the React frontend with the Supabase database and serves real-time object tracking feeds over WebSockets.

---

### Directory Layout

```
backend/
├── main.py                     # FastAPI application entrypoint & WebSocket /ws/live
├── requirements.txt            # Python dependencies (FastAPI, Uvicorn, Supabase, etc.)
├── .env                        # Server-side environment variables & Supabase keys
├── README.md                   # Setup and execution guide
├── api/
│   ├── cameras.py              # GET /api/cameras
│   ├── detections.py           # GET /api/detections
│   ├── events.py               # GET /api/events
│   └── alerts.py               # GET /api/alerts & status updates
├── services/
│   ├── supabase_service.py     # Supabase database client and query layer
│   ├── detection_service.py    # YOLOv8 + ByteTrack detection & tracking engine
│   └── event_service.py        # Threat evaluation and alert dispatcher
└── models/
    └── schemas.py              # Pydantic data validation schemas
```

---

### Quick Start (Local Setup)

#### 1. Navigate to the `backend/` directory:
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

#### 4. Configure Environment Variables (`.env`):
Check `backend/.env` and ensure your Supabase keys are configured:
```env
SUPABASE_URL=https://tlpdoykzxpwzvhzypsqq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=sb_publishable_aezuXbrKhTWnvUMXo9L1oA_PIpWioCM
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=*
```

> **Security Note:** The `SUPABASE_SERVICE_ROLE_KEY` is kept strictly within `backend/.env` and is **never** exposed to the React frontend.

#### 5. Start the FastAPI Server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Or directly with Python:
```bash
python main.py
```

The server will be available at:
- **API Base:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`
- **Health Diagnostics:** `http://localhost:8000/api/health`

---

### Available Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health, uptime, and database connector status |
| `GET` | `/api/cameras` | List all operational cameras from Supabase |
| `GET` | `/api/cameras/{id}` | Get camera metadata by ID / code |
| `GET` | `/api/detections` | Fetch recent tracked object detections |
| `GET` | `/api/events` | List security & friendly identification events |
| `GET` | `/api/alerts` | List active & historical perimeter alarms |
| `POST` | `/api/alerts/{id}/action` | Acknowledge or Resolve an alert |
| `WS` | `/ws/live` | Real-time WebSocket streaming detection bounding boxes |

---

### Real-Time WebSocket Interface (`/ws/live`)

Clients connecting to `ws://localhost:8000/ws/live` (or `ws://localhost:8000/ws/live?camera_id=BOP-001`) receive a continuous stream of detection frames:

```json
{
  "camera_id": "BOP-001",
  "track_id": "P-104",
  "object_type": "person",
  "confidence": 0.96,
  "bbox": [120, 180, 280, 520],
  "identity": null,
  "friendly": false,
  "timestamp": "2026-09-29T08:00:00Z"
}
```

#### JavaScript Consumer Example:
```javascript
const socket = new WebSocket('ws://localhost:8000/ws/live?camera_id=BOP-001');

socket.onmessage = (event) => {
  const detection = JSON.parse(event.data);
  console.log('Tracked object:', detection.track_id, detection.bbox);
};
```

---

### Replacing the Simulator with YOLOv8 + ByteTrack

To connect real YOLOv8 inference:
1. Place weights file in `backend/weights/yolov8n.pt`.
2. In [`services/detection_service.py`](./services/detection_service.py), install `ultralytics` (`pip install ultralytics opencv-python`).
3. Implement `run_inference_on_frame(frame_bytes, camera_id)` using `YOLO("weights/yolov8n.pt").track(frame)`.
