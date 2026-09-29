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
  └── Spatial Virtual Fence Event Engine (Intrusion, Loitering, Night Movement, Stationary Behavior)
       │
       ├─► Supabase Database & Storage (Events, Alerts, Cameras, Friendly Persons)
       ├─► MJPEG Preview (GET /api/streams/{camera_id}/preview for local dev)
       └─► WebSocket Streaming Channel (/ws/live/{camera_id})
               │
               ▼
IBVAP React Live Surveillance Dashboard (Vite / React 19)
```

---

## ⚡ Tech Stack

- **Frontend**: React 19 + Vite 6 + Tailwind CSS (Charcoal/Dark Command Center Theme)
- **Backend API**: Python 3.12 + FastAPI + Uvicorn + WebSockets
- **AI Vision**: YOLOv8 (Ultralytics) + ByteTrack + FaceNet (`facenet-pytorch`) + PaddleOCR
- **Database & Storage**: Supabase (`@supabase/supabase-js` / Python `supabase`)
- **Visualizations**: Recharts + Lucide React + Framer Motion
- **Audio Engine**: Web Audio API (Synthesized tactical alert sirens)

---

## 🚀 Getting Started

### 1. Backend Setup & Startup

#### A. Navigate to backend:
```powershell
cd backend
```

#### B. Create & Activate Virtual Environment:
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

#### C. Install Dependencies:
```powershell
pip install -r requirements.txt
```

#### D. Start FastAPI Backend Server:
```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Backend Swagger Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
Health Check Endpoint: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### 2. Frontend Setup & Startup

#### A. Navigate to root directory:
```powershell
cd ..
```

#### B. Install Frontend Dependencies:
```powershell
npm install
```

#### C. Configure Environment Variables (`.env`):
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

#### D. Start Frontend Development Server:
```powershell
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

#### E. Production Build:
```powershell
npm run build
npm run preview
```

---

## 📹 CCTV Streaming & AI Pipeline Execution

### Local MP4 Video File (Development / Demo Mode)
1. In `backend/.env`, set:
   ```env
   STREAM_SOURCE_MODE=video_file
   TEST_VIDEO_PATH=sample_feed.mp4
   ```
2. Start stream worker for camera `BOP-001`:
   ```bash
   curl -X POST "http://localhost:8000/api/streams/start/BOP-001"
   ```

### Real RTSP IP CCTV Camera
1. In `backend/.env`, set:
   ```env
   STREAM_SOURCE_MODE=rtsp
   ```
2. Start camera with RTSP URL:
   ```bash
   curl -X POST "http://localhost:8000/api/streams/start/BOP-001?rtsp_url=rtsp://admin:pass@192.168.1.100:554/live"
   ```

### Stop Camera Stream
```bash
curl -X POST "http://localhost:8000/api/streams/stop/BOP-001"
```

---

## 🧪 Running Automated Test Suites

```powershell
# In backend directory:
python test_streaming_pipeline.py  # CCTV Ingestion & Real-Time Streaming
python test_event_engine.py        # Event Engine (Virtual Fence, Loitering, Night Movement)
python test_face_api.py            # Biometric Face Recognition
python test_anpr_api.py            # Automatic Number Plate Recognition
python test_detect_api.py          # YOLO Inference Endpoint
python test_tracking_api.py        # ByteTrack Multi-Object Tracking Persistence
```
