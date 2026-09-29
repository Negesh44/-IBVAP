# IBVAP — Comprehensive Troubleshooting Guide

**Platform**: Intelligent Border Video Analytics Platform (IBVAP)  
**Document Version**: 1.0.0  
**Target**: Quick Diagnostic & Remediation for Evaluators and Developers  

---

## 1. Backend Diagnostics

### Symptom 1: Backend Won't Start
- **Cause**: Missing Python dependencies or port 8000 already bound.
- **Diagnostic Command**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess
  ```
- **Remediation**:
  1. Activate virtual environment: `.\backend\venv\Scripts\Activate.ps1`.
  2. Install requirements: `pip install -r backend/requirements.txt`.
  3. Kill conflicting process or change port: `uvicorn main:app --port 8001`.

### Symptom 2: YOLO Model Weights Not Found
- **Cause**: File at `YOLO_MODEL_PATH` missing.
- **Remediation**:
  The system dynamically searches multiple candidate paths:
  - `models/best.pt`
  - `/app/models/best.pt`
  - `backend/models/best.pt`
  - `weights/best.pt`
  - `yolov8n.pt`
  Place any `.pt` weights file in `backend/models/best.pt` or let `ultralytics` automatically download `yolov8n.pt` on first inference.

### Symptom 3: CUDA / GPU Unavailable
- **Cause**: System lacks NVIDIA GPU, or CUDA drivers are uninstalled.
- **Behavior**: System automatically logs `CUDA not available. Using CPU for inference.`
- **Remediation**: No action required. The inference pipeline operates reliably on multi-threaded CPU tensors. To force CUDA on supported machines, ensure NVIDIA drivers 535+ and PyTorch with CUDA are installed (`pip install torch --index-url https://download.pytorch.org/whl/cu121`).

---

## 2. Ingestion & Ingest Worker Diagnostics

### Symptom 4: RTSP Connection Failure
- **Cause**: IP camera offline, wrong RTSP credentials, or network firewall.
- **Remediation**:
  1. Verify stream reachable via VLC / FFmpeg: `ffmpeg -i rtsp://user:pass@ip:554/stream -t 5 -f null -`.
  2. For evaluation and testing without physical cameras, use **Demo Mode** (`DEMO_MODE=true`), which uses `sample_feed.mp4` or generates a synthetic surveillance feed automatically.

### Symptom 5: WebSocket Disconnections
- **Cause**: Network blip or backend restart.
- **Behavior**: The frontend `liveSocket.ts` service enters exponential backoff retry (`RECONNECTING` state) and automatically re-establishes connection upon server availability.

---

## 3. Database, Auth & Security Diagnostics

### Symptom 6: Supabase Connection Failure
- **Cause**: Invalid `SUPABASE_URL` or missing internet connectivity.
- **Behavior**: `supabase_service.py` gracefully catches connection errors and switches to `LOCAL_FALLBACK` mode using in-memory caches.
- **Remediation**: Check internet access and verify `.env` credentials.

### Symptom 7: HTTP 401 Unauthorized Errors
- **Cause**: Missing, malformed, or expired Bearer token in request header.
- **Remediation**: Log in through the UI or provide a valid JWT in the `Authorization: Bearer <TOKEN>` header.

### Symptom 8: HTTP 403 Forbidden Errors
- **Cause**: Role authorization failure (e.g. `VIEWER` attempting to acknowledge alerts or start streams).
- **Remediation**: Check logged-in role. Switch to `ADMIN` or `COMMANDER` profile for privileged actions.

### Symptom 9: Evidence Upload Fails
- **Cause**: Storage bucket `evidence` not initialized or RLS policy missing.
- **Remediation**: Execute `backend/migrations/02_realtime_evidence_rls.sql` in Supabase SQL Editor.

---

## 4. Frontend & Docker Diagnostics

### Symptom 10: Frontend Build Errors
- **Remediation**:
  1. Clear Vite caches: `Remove-Item -Recurse -Force node_modules/.vite, dist`.
  2. Reinstall packages: `npm install`.
  3. Verify build: `npm run build`.

### Symptom 11: Docker GPU Container Errors
- **Cause**: NVIDIA Container Toolkit not configured on Docker host.
- **Remediation**:
  1. On Linux, run `sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker`.
  2. For CPU-only Docker execution, comment out the `deploy.resources.reservations.devices` block in `docker-compose.yml`.
