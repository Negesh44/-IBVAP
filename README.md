# IBVAP — Intelligent Border Video Analytics Platform

An AI-based Border Surveillance & Tactical Video Analytics Platform designed for high-security command centers, border outposts (BOPs), and defense monitoring. Built for **Smart India Hackathon (SIH)**.

---

## 🛰️ Full System Architecture

```
IP CCTV Cameras (RTSP / ONVIF / MP4)
       │
       ▼
Python FastAPI AI Backend (Docker GPU Container / Port 8000)
  ├── Security & Auth Guard (JWT Bearer Verification & RBAC Permissions)
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
       ├─► MJPEG Preview (GET /api/streams/{camera_id}/preview for authenticated operators)
       ├─► WebSocket Streaming Channel (/ws/live/{camera_id})
       └─► System Health & Metrics Endpoints (/api/system/health, /api/system/metrics)
               │
               ▼
IBVAP React Live Surveillance Dashboard (Vite / React 19)
  ├── Supabase Authentication & Profile Management
  ├── Client-Side RBAC Protection (ADMIN, COMMANDER, OPERATOR, VIEWER)
  ├── 5-Interval Time Filter (1h, 6h, 24h, 7d, 30d)
  ├── 7 Interactive Recharts Analytics Panels
  ├── Live System Health & GPU Status Monitoring (5000ms Refresh)
  └── Tamper-Evident Audit Trail & User Management
```

---

## ⚡ Tech Stack

- **Frontend**: React 19 + Vite 6 + Tailwind CSS (Charcoal/Dark Command Center Theme)
- **Backend API**: Python 3.12 + FastAPI + Uvicorn + WebSockets
- **AI Vision**: YOLOv8 (Ultralytics) + ByteTrack + FaceNet (`facenet-pytorch`) + PaddleOCR
- **Security & Auth**: Supabase Auth (JWT) + Row Level Security (RLS) + Custom RBAC Guards
- **Database & Storage**: Supabase PostgreSQL + Supabase Private Storage Buckets
- **Deployment**: Docker + NVIDIA Container Toolkit (CUDA) + Docker Compose
- **System Monitoring**: `psutil` + `nvidia-smi` / `torch.cuda` hardware monitor
- **Visualizations**: Recharts + Lucide React + Framer Motion
- **Audio Engine**: Web Audio API (Synthesized tactical alert sirens)

---

## 🎯 IBVAP SIH Demo Mode (End-to-End Walkthrough)

Follow these steps for a complete SIH demonstration:

### 1. Install Dependencies
```powershell
# Backend Dependencies
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Frontend Dependencies
cd ..
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in both root and `backend/`:
```powershell
cp .env.example .env
cp backend/.env.example backend/.env
```

### 3. Place Demo Video (or Auto-Generate)
You can place a sample video at `sample_feed.mp4` or configure `DEMO_VIDEO_PATH` in `backend/.env`. If omitted, the platform automatically generates an OpenCV synthetic tactical border feed on startup!

### 4. Start the FastAPI Backend
```powershell
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 5. Start the React Frontend Dashboard
```powershell
npm run dev
```
Access the tactical command center at: [http://localhost:5173](http://localhost:5173)

### 6. Start the Demonstration
- Navigate to **Live Surveillance** on the frontend.
- In the top **SIH DEMO MODE** toolbar, click **START DEMO** (Available to `ADMIN` and `COMMANDER`).
- Alternatively, trigger via REST:
  ```powershell
  curl -X POST http://localhost:8000/api/demo/start -H "Authorization: Bearer <TOKEN>"
  ```

### 7. Open Live Surveillance
Camera `DEMO-001` (**Border Surveillance Demo**) appears in the surveillance matrix with live status `ONLINE`.

### 8. View Real-Time YOLO Detections
The optical bounding overlay outlines moving targets (`person`, `car`, `truck`, `bus`, `motorcycle`) with dynamic confidence chips.

### 9. View ByteTrack Target Tracking
Targets maintain persistent track IDs (`P-101`, `P-102`) across frames with velocity vectors and occlusion resilience.

### 10. View Spatial Event Engine Triggering
When a tracked target enters the restricted virtual fence zone or loiters beyond the configured threshold, security events are computed.

### 11. View Tactical Alerts & Sirens
The top alert banner triggers critical audio sirens (Web Audio API) and creates triage items in the Alert Center.

### 12. View Evidence Vault
High-resolution evidence snapshots with bounding boxes and forensic metadata are uploaded to Supabase Storage and stored in the Evidence Vault.

### 13. View Analytics & Fleet Telemetry
Navigate to **Analytics** to view 7 Recharts panels with time windows (`1h`, `6h`, `24h`, `7d`, `30d`), fleet rankings, and GPU hardware telemetry.

### 14. Stop Demo & Reset
Click **STOP DEMO** or **RESET DEMO** on the Live Surveillance bar to halt ingestion and clear test counters without affecting production database records.

---

### 🛠️ Troubleshooting Guide

- **GPU Acceleration Fallback**: If CUDA is not detected, PyTorch logs `CUDA not available. Using CPU for inference.` and executes multi-threaded CPU tensors without crashing.
- **Video Codec Compatibility**: Ensure MP4 files use standard H.264 or MPEG-4 encoding. The platform automatically tries `mp4v` and `XVID` fallbacks.
- **Supabase Offline Resilience**: If internet or database credentials are unavailable, the backend gracefully runs in `LOCAL_FALLBACK` mode using local caches.
- **WebSocket Reconnection**: If the backend restarts, the frontend WebSocket service automatically enters exponential backoff retry until reconnecting.

---

## 🐳 Docker Containerization & GPU Deployment

The IBVAP backend is containerized for production deployment with full NVIDIA Container Toolkit GPU support:

### Building and Starting Containers
```powershell
# Build image
docker compose build

# Start detached
docker compose up -d

# View live container logs
docker compose logs -f ibvap-backend

# Stop containers
docker compose down
```

---

## 🛡️ Role-Based Access Control (RBAC) & Security

| Feature / Permission | `ADMIN` | `COMMANDER` | `OPERATOR` | `VIEWER` |
| :--- | :---: | :---: | :---: | :---: |
| **Live Surveillance Feeds & Telemetry** | ✅ | ✅ | ✅ | ✅ (Masked HW info) |
| **View Alerts & Security Events** | ✅ | ✅ | ✅ | ✅ |
| **Acknowledge / Resolve Alerts** | ✅ | ✅ | ✅ | ❌ Read-Only |
| **Start / Stop Demo & Camera Streams** | ✅ | ✅ | ❌ | ❌ |
| **Configure Virtual Fences & Cameras** | ✅ | ✅ | ❌ | ❌ |
| **Enroll Friendly Biometric Persons** | ✅ | ✅ | ❌ Read-Only | ❌ Read-Only |
| **Decommission Cameras / Delete Biometrics** | ✅ | ❌ | ❌ | ❌ |
| **User Role Management** | ✅ | ❌ | ❌ | ❌ |
| **View Tamper-Evident Audit Logs** | ✅ | ✅ | ❌ | ❌ |

---

## 🧪 Testing & Verification

### Run Complete Test Suite (24 Tests)
```powershell
cd backend
python -m unittest discover -s . -p "test_*.py"
```
Or run individual test modules:
```powershell
python test_integration_e2e.py    # 10/10 PASS: Complete 10-stage end-to-end pipeline verification
python test_security.py           # 9/9 PASS: JWT validation, 401/403 RBAC guards, sanitize, upload check
python test_system_health.py      # 5/5 PASS: GPU fallback, zero-camera fleet, empty metrics handling
```

### Frontend Build Verification
```powershell
npm run build
```
Compiled with zero TypeScript / JSX errors with optimized production bundle code splitting.
