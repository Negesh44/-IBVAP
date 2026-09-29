# IBVAP — Intelligent Border Video Analytics Platform

An AI-based Border Surveillance & Tactical Video Analytics Platform designed for high-security command centers, border outposts (BOPs), and defense monitoring. Built for **Smart India Hackathon (SIH 2026)**.

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

> Detailed architecture diagram: [`docs/architecture.svg`](file:///c:/Users/DELL/Desktop/sih%202/docs/architecture.svg) | Technical specification: [`docs/ARCHITECTURE.md`](file:///c:/Users/DELL/Desktop/sih%202/docs/ARCHITECTURE.md)

---

## ⚡ Tech Stack

- **Frontend**: React 19 + Vite 6 + Tailwind CSS (Charcoal/Dark Command Center Theme)
- **Backend API**: Python 3.12 + FastAPI + Uvicorn + WebSockets
- **AI Vision**: YOLOv8 (Ultralytics) + ByteTrack + FaceNet (`facenet-pytorch`) + PaddleOCR
- **Security & Auth**: Supabase Auth (JWT) + Row Level Security (RLS) + Custom RBAC Guards
- **Database & Storage**: Supabase PostgreSQL 15+ + Supabase Private Storage Buckets
- **Deployment**: Docker + NVIDIA Container Toolkit (CUDA) + Docker Compose
- **System Monitoring**: `psutil` + `nvidia-smi` / `torch.cuda` hardware monitor
- **Visualizations**: Recharts + Lucide React + Framer Motion
- **Audio Engine**: Web Audio API (Synthesized tactical alert sirens)

---

## 📚 Detailed Documentation

| Document | Description |
| :--- | :--- |
| [**Architecture Specification**](file:///c:/Users/DELL/Desktop/sih%202/docs/ARCHITECTURE.md) | In-depth multi-tier architecture & data flow diagrams |
| [**API Documentation**](file:///c:/Users/DELL/Desktop/sih%202/docs/API_DOCUMENTATION.md) | Complete OpenAPI / REST & WebSocket endpoint catalog |
| [**Database Schema**](file:///c:/Users/DELL/Desktop/sih%202/docs/DATABASE_SCHEMA.md) | PostgreSQL relational schemas, RLS policies, & storage buckets |
| [**AI Pipeline Specification**](file:///c:/Users/DELL/Desktop/sih%202/docs/AI_PIPELINE.md) | Vision models, tracking algorithms, ANPR, & spatial event rules |
| [**SIH Demo Guide**](file:///c:/Users/DELL/Desktop/sih%202/docs/DEMO_GUIDE.md) | 18-step presentation walkthrough sequence for evaluators |
| [**SIH Readiness Checklist**](file:///c:/Users/DELL/Desktop/sih%202/docs/SIH_DEMO_CHECKLIST.md) | Verified component checklist based on automated test runs |
| [**Deployment Guide**](file:///c:/Users/DELL/Desktop/sih%202/docs/DEPLOYMENT.md) | Local Python, Node.js, and Docker GPU setup instructions |
| [**Security & RBAC Guide**](file:///c:/Users/DELL/Desktop/sih%202/docs/SECURITY.md) | Defense-in-depth, 4-tier RBAC matrix, and upload validation |
| [**Testing Guide**](file:///c:/Users/DELL/Desktop/sih%202/docs/TESTING.md) | Unit tests, security tests, and 10-step E2E integration verification |
| [**Troubleshooting Guide**](file:///c:/Users/DELL/Desktop/sih%202/docs/TROUBLESHOOTING.md) | Diagnostics and fixes for runtime and environment issues |
| [**Project Status Report**](file:///c:/Users/DELL/Desktop/sih%202/docs/PROJECT_STATUS.md) | Factual component implementation & scope breakdown |

---

## 🎯 Quick Start: SIH Demonstration Mode

### 1. Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
```powershell
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. One-Click Demo
1. Log in with **Admin** clearance (`admin@ibvap.gov.in`).
2. Go to **Live Surveillance**.
3. In the top toolbar, click **START DEMO**.
4. The system streams `DEMO-001` with real-time YOLO bounding boxes, ByteTrack IDs, biometric identification, and virtual fence intrusion triggers!

---

## 🧪 Testing & Verification

Run the complete 24-test verification suite:
```powershell
cd backend
python -m unittest discover -s . -p "test_*.py"
```

Verify frontend production build:
```powershell
npm run build
```

---

## 🛡️ Security & Role-Based Access Control (RBAC)

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

## ⚠️ Known Scope & Evaluation Notes

1. **Hardware Telemetry**: GPU utilization and temperature reflect host NVIDIA hardware metrics when available; CPU fallback operates on standard hardware.
2. **Biometric Whitelist**: Face recognition matches against enrolled Friendly Persons; unknown individuals are classified as `UNKNOWN` without fabricating threats.
3. **ANPR Scope**: License plate character extraction uses PaddleOCR; non-standard or heavily damaged plates may result in partial character matches.
