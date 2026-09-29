# IBVAP — Intelligent Border Video Analytics Platform

An AI-based Border Surveillance & Tactical Video Analytics Platform designed for high-security command centers, border outposts (BOPs), and defense monitoring. Built for **Smart India Hackathon (SIH)**.

---

## 🛰️ Full System Architecture

```
IP CCTV Cameras (RTSP / ONVIF / MP4)
       │
       ▼
Python FastAPI AI Backend (Port 8000)
  ├── RTSP Stream Capture (OpenCV low-latency buffer & auto-reconnection)
  ├── CameraWorker Threads (Isolated queue & 5 FPS rate limiter per camera)
  ├── YOLOv8 (Human & Vehicle Spatial Detection: person, car, truck, bus, motorcycle)
  ├── ByteTrack (Occlusion-Resilient Target Tracking with persistent track IDs)
  ├── Biometric Face Recognition (InceptionResnetV1 512-D normalized embeddings)
  ├── ANPR Engine (PaddleOCR License Plate Optical Character Recognition)
  ├── Spatial Virtual Fence Event Engine (Intrusion, Loitering, Night Movement, Stationary Behavior)
  ├── System Health & Latency Monitor (Hardware GPU telemetry, rolling component latencies)
       │
       ├─► Supabase Database & Private Storage (Events, Alerts, Cameras, Evidence Images)
       ├─► MJPEG Preview (GET /api/streams/{camera_id}/preview for local dev)
       ├─► WebSocket Streaming Channel (/ws/live/{camera_id})
       └─► System Health & Metrics Endpoints (/api/system/health, /api/system/metrics)
               │
               ▼
IBVAP React Live Surveillance Dashboard (Vite / React 19)
  ├── 5-Interval Time Filter (1h, 6h, 24h, 7d, 30d)
  ├── 7 Interactive Recharts Analytics Panels
  ├── Live System Health & GPU Status Monitoring (5000ms Refresh)
  └── Role-Based Access Control (ADMIN, COMMANDER, OPERATOR, VIEWER)
```

---

## ⚡ Tech Stack

- **Frontend**: React 19 + Vite 6 + Tailwind CSS (Charcoal/Dark Command Center Theme)
- **Backend API**: Python 3.12 + FastAPI + Uvicorn + WebSockets
- **AI Vision**: YOLOv8 (Ultralytics) + ByteTrack + FaceNet (`facenet-pytorch`) + PaddleOCR
- **Database & Storage**: Supabase (`@supabase/supabase-js` / Python `supabase`)
- **System Monitoring**: `psutil` + `nvidia-smi` / `torch.cuda` hardware monitor
- **Visualizations**: Recharts + Lucide React + Framer Motion
- **Audio Engine**: Web Audio API (Synthesized tactical alert sirens)

---

## 📊 Analytics & System Health Module

### 1. Analytics Service (`src/services/analytics.ts`)
Calculates real-time aggregated metrics from Supabase tables across selectable timeframes:
- **Time Windows**: `Last 1 hour`, `Last 6 hours`, `Last 24 hours`, `Last 7 days`, `Last 30 days`
- **Calculated Telemetry**:
  - `getEventStatistics()`: Total events, intrusions, loitering, night movements, stationary behaviors, ANPR plate scans, friendly matches, and unknown persons.
  - `getAlertStatistics()`: Total alerts, active, resolved, acknowledged, and triage by severity (CRITICAL, WARNING, INFO).
  - `getDetectionStatistics()`: Optical class breakdown (`person`, `car`, `truck`, `bus`, `motorcycle`) and biometrics ratios.
  - `getCameraStatistics()`: Stream density rankings, operational status, event load, alert count, and last activity timestamp.
  - `getHourlyActivity()` / `getDailyActivity()`: Chronological incident and alarm area charts.

### 2. System Health & Performance API
- **`GET /api/system/health`**:
  Returns platform status, uptime, host CPU %, memory %, NVIDIA GPU hardware telemetry (device name, VRAM used/total, GPU utilization, temperature), active camera streams count, and average YOLO inference latency.
- **`GET /api/system/metrics`**:
  Returns in-memory rolling component latencies (YOLO inference, ByteTrack tracking, Face recognition, ANPR OCR, Event Engine evaluation), frames processed counter, and camera load distribution.

> **Note on Prototype Scope**: The telemetry metrics provided are application-level performance metrics for the IBVAP prototype demonstration and are not intended as an enterprise OS-level monitoring replacement.

---

## ⚙️ Environment Variables

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://tlpdoykzxpwzvhzypsqq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_aezuXbrKhTWnvUMXo9L1oA_PIpWioCM
VITE_APP_NAME="IBVAP — Intelligent Border Video Analytics Platform"
VITE_APP_VERSION="1.0.0-SIH2026"

# FastAPI Backend & WebSocket Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_USE_MOCK_LIVE_DATA=false
```

### Backend (`backend/.env`)
```env
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=*

# AI Model Paths
YOLO_MODEL_PATH=weights/best.pt
ANPR_MODEL_PATH=weights/plate_detector.pt
FACE_MODEL_PATH=weights/facenet.pt
FACE_MATCH_THRESHOLD=0.45

# Tracking Parameters
TRACKER_TRACK_THRESH=0.40
TRACKER_TRACK_BUFFER=30
TRACKER_MATCH_THRESH=0.80

# CCTV Ingestion Rate
PROCESS_FPS=5.0
```

---

## 🚀 Running the Platform

### 1. Backend Server
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- API Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- System Health: [http://localhost:8000/api/system/health](http://localhost:8000/api/system/health)
- Performance Metrics: [http://localhost:8000/api/system/metrics](http://localhost:8000/api/system/metrics)

### 2. Frontend Dashboard
```powershell
npm install
npm run dev
```
Access the application at [http://localhost:5173](http://localhost:5173).

---

## 🧪 Testing

### Backend Test Suites
```powershell
cd backend
python -m unittest discover -s . -p "test_*.py"
```
Or run individual test modules:
```powershell
python test_system_health.py        # System health, GPU fallback, zero-camera, empty telemetry
python test_workflow.py             # Realtime evidence, storage upload, alert lifecycle & audit logs
python test_streaming_pipeline.py   # RTSP capture, camera worker thread & frame processor
python test_event_engine.py         # Virtual fence, loitering & night movement rules
python test_face_api.py             # FaceNet biometric matcher & friendly person verification
python test_anpr_api.py             # PaddleOCR plate extraction & image normalization
```

### Frontend Build Verification
```powershell
npm run build
```
Verifies complete bundle compilation with zero TypeScript or JSX syntax errors.
