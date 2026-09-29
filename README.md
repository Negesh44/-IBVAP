# IBVAP — Intelligent Border Video Analytics Platform

An AI-based Border Surveillance & Tactical Video Analytics Platform designed for high-security command centers, border outposts (BOPs), and defense monitoring. Built for **Smart India Hackathon (SIH)**.

---

## 🛰️ Full System Architecture

```
IP CCTV Cameras (RTSP / ONVIF / MP4)
       │
       ▼
Python FastAPI AI Backend (Port 8000)
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
- **System Monitoring**: `psutil` + `nvidia-smi` / `torch.cuda` hardware monitor
- **Visualizations**: Recharts + Lucide React + Framer Motion
- **Audio Engine**: Web Audio API (Synthesized tactical alert sirens)

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

### Security Measures Implemented
1. **JWT Verification**: Every FastAPI route validates Bearer tokens, token expiration (`exp`), and user claims via Supabase JWT decoding/verification.
2. **Database Row-Level Security (RLS)**: PostgreSQL policies on `profiles`, `friendly_persons`, `cameras`, `alerts`, `events`, and `audit_logs` prevent unauthorized access even if client requests bypass UI guards.
3. **Immutable Audit Trail**: Audit logs are append-only. UPDATE and DELETE policies are permanently revoked on `audit_logs`.
4. **Credential Isolation**: RTSP passwords and the `SUPABASE_SERVICE_ROLE_KEY` are stripped/masked before sending responses to clients.
5. **Secure File Uploads**: Image uploads verify file size ($\le 10$ MB), magic byte signatures (JPEG, PNG, WEBP), MIME types, and use randomized server-side UUID filenames.
6. **Input Sanitization**: Camera IDs and identifiers are strictly validated against regex `^[A-Za-z0-9_-]{3,32}$` to prevent injection attacks and path traversals.
7. **Security Headers**: Standard defense headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`) are attached to all backend responses.

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
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Supabase Service Integration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

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
Access the tactical dashboard at [http://localhost:5173](http://localhost:5173).

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
