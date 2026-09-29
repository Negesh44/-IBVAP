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

## 🐳 Docker Containerization & GPU Deployment

The IBVAP backend is containerized for production deployment with full NVIDIA Container Toolkit GPU support and automatic CPU fallback.

### A. CPU Development (No GPU Required)
Run natively or in Docker without dedicated graphics hardware:
```powershell
# Run locally with Python
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
PyTorch automatically detects that CUDA is unavailable and falls back cleanly to optimized multi-threaded CPU tensor execution.

### B. NVIDIA GPU Development
If you have an NVIDIA GPU (e.g. RTX 3050/4090/A100), PyTorch will automatically allocate model weights and inference onto `cuda:0`:
```powershell
# Set environment
$env:CUDA_VISIBLE_DEVICES="0"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### C. Installing NVIDIA Container Toolkit (For Docker GPU)
To enable GPU pass-through from the host into Docker:
1. **Linux / WSL2**:
   ```bash
   curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
   curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
     sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
     sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
   sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
   sudo nvidia-ctk runtime configure --runtime=docker
   sudo systemctl restart docker
   ```
2. **Windows**:
   Install Docker Desktop with WSL2 backend enabled. NVIDIA drivers on the Windows host pass through CUDA automatically into Docker.

### D. Building the Docker Image
```powershell
# Build from project root
docker compose build

# Or build from backend directory
cd backend
docker compose build
```

### E. Starting the Containers
```powershell
# Start detached
docker compose up -d

# View live container logs
docker compose logs -f ibvap-backend
```

### F. Stopping the Containers
```powershell
docker compose down
```

### G. Mounting `best.pt` Model Weights
Place your trained weights at `backend/models/best.pt`. The Docker Compose file automatically bind-mounts this directory:
```yaml
volumes:
  - ./backend/models:/app/models
```
In the container, the weights resolve at `/app/models/best.pt`. You can swap or update weights on the host without rebuilding the container.

### H. Setting Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp backend/.env.example backend/.env
```
Ensure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET` are configured.

### I. Checking GPU Detection
Verify GPU recognition inside the container via the diagnostic endpoint:
```powershell
curl http://localhost:8000/api/system/health -H "Authorization: Bearer <TOKEN>"
```
Response sample:
```json
{
  "status": "healthy",
  "gpu": {
    "gpu_available": true,
    "gpu_name": "NVIDIA GeForce RTX 3050 6GB Laptop GPU",
    "gpu_memory_used_mb": 1420,
    "gpu_memory_total_mb": 6144,
    "gpu_utilization_percent": 18.5,
    "gpu_temperature_c": 52
  }
}
```

### J. Checking FastAPI Health (Docker Healthcheck)
```powershell
curl http://localhost:8000/api/health
```
Returns `{"status": "healthy", "platform": "IBVAP", "version": "1.0.0", ...}`.

### K. Running a Local MP4 Demo Feed
Set in `backend/.env`:
```env
STREAM_SOURCE_MODE=video_file
TEST_VIDEO_PATH=sample_feed.mp4
```
Start the stream via the React Live Surveillance Dashboard or API:
```powershell
curl -X POST http://localhost:8000/api/streams/start/BOP-001 -H "Authorization: Bearer <TOKEN>"
```

---

## 🛡️ Role-Based Access Control (RBAC) & Security

IBVAP implements end-to-end defense-in-depth security across the React frontend, FastAPI gateway, and Supabase PostgreSQL database:

| Feature / Permission | `ADMIN` | `COMMANDER` | `OPERATOR` | `VIEWER` |
| :--- | :---: | :---: | :---: | :---: |
| **Live Surveillance Feeds & Telemetry** | ✅ | ✅ | ✅ | ✅ (Masked HW info) |
| **View Alerts & Security Events** | ✅ | ✅ | ✅ | ✅ |
| **Acknowledge / Resolve Alerts** | ✅ | ✅ | ✅ | ❌ Read-Only |
| **Start / Stop Camera Streams** | ✅ | ✅ | ✅ | ❌ Read-Only |
| **Configure Virtual Fences & Cameras** | ✅ | ✅ | ❌ | ❌ |
| **Enroll Friendly Biometric Persons** | ✅ | ✅ | ❌ Read-Only | ❌ Read-Only |
| **Decommission Cameras / Delete Biometrics** | ✅ | ❌ | ❌ | ❌ |
| **User Role Management** | ✅ | ❌ | ❌ | ❌ |
| **View Tamper-Evident Audit Logs** | ✅ | ✅ | ❌ | ❌ |

---

## ⚙️ Environment Variables

### Frontend Configuration (`.env.example`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APP_NAME="IBVAP — Intelligent Border Video Analytics Platform"
VITE_APP_VERSION="1.0.0-SIH2026"

# FastAPI Backend & WebSocket Gateway
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_USE_MOCK_LIVE_DATA=false
```

### Backend Configuration (`backend/.env.example`)
```env
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=production
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Supabase Service Integration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# AI Model File Paths & Detection Thresholds
YOLO_MODEL_PATH=/app/models/best.pt
YOLO_CONFIDENCE=0.40

# License Plate Detection (ANPR) & OCR
ANPR_MODEL_PATH=
ANPR_CONFIDENCE=0.40
OCR_CONFIDENCE=0.50

# Biometric Facial Recognition
FACE_MODEL_PATH=
FACE_MATCH_THRESHOLD=0.45

# Multi-Object Tracker (ByteTrack)
TRACKER_TRACK_THRESH=0.40
TRACKER_TRACK_BUFFER=30
TRACKER_MATCH_THRESH=0.80

# CCTV Ingestion & Real-Time Processing
PROCESS_FPS=5
STREAM_SOURCE_MODE=video_file
```

---

## 🧪 Testing & Verification

### Backend Test Suites (14 Tests Passed)
```powershell
cd backend
python -m unittest discover -s . -p "test_*.py"
```
Or run dedicated security and telemetry suites:
```powershell
python test_security.py         # 9/9 Passed: JWT validation, 401/403 RBAC guards, sanitize, upload check
python test_system_health.py    # 5/5 Passed: GPU fallback, zero-camera fleet, empty metrics handling
python test_workflow.py         # Realtime evidence, storage upload, alert lifecycle & audit logs
python test_streaming_pipeline.py # RTSP capture, camera worker thread & frame processor
python test_event_engine.py     # Virtual fence, loitering & night movement rules
python test_face_api.py         # FaceNet biometric matcher & friendly person verification
python test_anpr_api.py         # PaddleOCR plate extraction & image normalization
```

### Frontend Build Verification
```powershell
npm run build
```
Compiled with zero TypeScript / JSX errors with optimized production bundle code splitting.

---

> [!NOTE]
> **Prototype & Demonstration Scope**: Hardware metrics, GPU telemetry, and AI detection thresholds are tailored for demonstration and evaluation in the SIH 2026 hackathon environment. Production deployments should enforce enterprise KMS secrets management, hardware key rings, and dedicated edge compute nodes (e.g., NVIDIA Jetson Orin / Clara).
