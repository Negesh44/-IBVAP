# IBVAP — Deployment & Environment Setup Guide

**Platform**: Intelligent Border Video Analytics Platform (IBVAP)  
**Document Version**: 1.0.0  
**Target Environments**: Native Windows/Linux Dev, Docker GPU Containers, Edge Nodes  

---

## 1. Prerequisites

- **Python**: 3.12+ (x86_64)
- **Node.js**: v18.0.0+ / npm 9.0.0+
- **Docker**: Docker Engine 24+ / Docker Desktop with WSL2 (Optional for containerization)
- **NVIDIA GPU** (Optional): NVIDIA Drivers 535+ & CUDA Toolkit 12.x

---

## 2. Environment Configuration

### Frontend Configuration (`.env`)
Create `.env` in the repository root:
```env
VITE_SUPABASE_URL=https://tlpdoykzxpwzvhzypsqq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_aezuXbrKhTWnvUMXo9L1oA_PIpWioCM
VITE_APP_NAME="IBVAP — Intelligent Border Video Analytics Platform"
VITE_APP_VERSION="1.0.0-SIH2026"

# FastAPI Backend & WebSocket Gateway
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_USE_MOCK_LIVE_DATA=false
```

### Backend Configuration (`backend/.env`)
Create `backend/.env`:
```env
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=production
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Supabase Service Integration
SUPABASE_URL=https://tlpdoykzxpwzvhzypsqq.supabase.co
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
TEST_VIDEO_PATH=sample_feed.mp4
```

---

## 3. Native Local Setup

### 3.1 Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3.2 Frontend Setup
```powershell
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 4. Docker Containerized GPU Deployment

### 4.1 NVIDIA Container Toolkit Setup (Linux / WSL2)
```bash
# Add NVIDIA Container Toolkit repository
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 4.2 Building and Launching Containers
```powershell
# Validate configuration
docker compose config

# Build container images
docker compose build

# Start detached
docker compose up -d

# Check live logs
docker compose logs -f ibvap-backend

# Stop container fleet
docker compose down
```

---

## 5. Supabase Database & Migrations

To apply database tables, Row-Level Security policies, and trigger functions in Supabase:
1. Navigate to your Supabase project dashboard $\to$ **SQL Editor**.
2. Run migrations in order:
   - [`backend/migrations/01_face_embeddings.sql`](file:///c:/Users/DELL/Desktop/sih%202/backend/migrations/01_face_embeddings.sql)
   - [`backend/migrations/02_realtime_evidence_rls.sql`](file:///c:/Users/DELL/Desktop/sih%202/backend/migrations/02_realtime_evidence_rls.sql)
   - [`backend/migrations/03_security_hardening_rls.sql`](file:///c:/Users/DELL/Desktop/sih%202/backend/migrations/03_security_hardening_rls.sql)
3. Ensure the private Storage bucket `evidence` is created with public access turned off.
