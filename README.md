# IBVAP — Intelligent Border Video Analytics Platform

An AI-based Border Surveillance & Tactical Video Analytics Platform frontend dashboard designed for high-security command centers, border outposts (BOPs), and defense monitoring. Built for **Smart India Hackathon (SIH)**.

---

## 🛰️ System Architecture

```
CCTV RTSP Multi-Streams
          ↓
  Python FastAPI Backend (Future AI Engine)
  ├── YOLOv8 (Human & Vehicle Spatial Detection)
  ├── ByteTrack (Occlusion-Resilient Target Tracking)
  ├── Face Recognition (512-dim ArcFace Embeddings)
  ├── ANPR Engine (License Plate Optical Character Recognition)
  └── Spatial Virtual Fence Event Engine
          ↓
  Supabase Database & Storage (Realtime WebSockets)
          ↓
  IBVAP React Frontend Dashboard (This Repository)
```

---

## ⚡ Tech Stack

- **Framework**: React 19 + Vite 6
- **Language**: JavaScript (ESM)
- **Styling**: Tailwind CSS (Custom Charcoal/Dark Command Center Theme)
- **Routing**: React Router v7
- **Database & Auth**: Supabase (`@supabase/supabase-js`)
- **Icons**: Lucide React
- **Analytics & Visualizations**: Recharts
- **Animations**: Framer Motion
- **Audio Engine**: Web Audio API (Synthesized tactical sirens)

---

## 🖥️ Application Features & Layout

### 1. **Tactical Operations Dashboard (`/dashboard`)**
- Top KPI statistics: Active Cameras (5/6), People Detected (308), Vehicles (89), Active Alerts (4), Friendly Persons (6), Events Today (397).
- Primary Focus CCTV stream with live bounding boxes and PTZ quick controls.
- Real-time detection activity Recharts area graph (People vs. Vehicles vs. Alarms).
- Live Security Alerts triage feed and Event Stream Timeline.

### 2. **Live Surveillance Matrix (`/live`)**
- Multi-channel CCTV matrix (1x1 single focus, 2x2 4-channel, 3x2 6-channel grids).
- Sector filters (`ALL`, `NORTH`, `EAST`, `WEST`, `SOUTH`).
- Simulated AI detection bounding boxes (`FRIENDLY` in green, `UNKNOWN` in amber, `BREACH/ALERT` in red, `VEHICLE` in cyan).
- Interactive PTZ slew controls, Digital Zoom (+/-), Night Vision green phosphor & Thermal spectrum toggle modes.
- Forensic snapshot capture and Fullscreen HD stream modal.

### 3. **Security Alert Management Center (`/alerts`)**
- Full incident triage: Virtual Fence Breach, Night Movement, Unknown Person, Loitering, Restricted Zone Entry.
- Filter by Severity: All, Critical, Warning, Resolved.
- Toggle between Card Grid view and Tactical Table view.
- Detailed Alert Dossier modal with forensic evidence snapshot, confidence telemetry, and QRT response dispatch.

### 4. **Friendly Persons & Biometric Identity Vault (`/friendly-persons`)**
- Authorized personnel directory across BSF, Indian Army, ITBP, and SSB.
- 512-dimensional facial recognition embedding checksum tracking and match confidence scores.
- Interactive Add/Edit/Delete/View identity profile modals structured for future deep learning biometric pipeline.

### 5. **Border Camera Fleet Management (`/cameras`)**
- Optical & Thermal sensor hardware registry (Resolution, FPS, Bitrate, Status, Sector).
- Add new camera node with RTSP URL, ONVIF ports, and password masking.
- Live stream inspection modal and interactive PTZ calibration modal.

### 6. **Border Event & Incident Log Archive (`/events`)**
- Immutable chronological log with event severity classification, timestamps, and target identities.
- Forensic evidence package inspection and archive export.

### 7. **Border Intelligence & Analytics Matrix (`/analytics`)**
- Hourly classification graphs (Personnel, Vehicles, Threat Events).
- Personnel vs. Vehicle distribution Donut chart.
- Threat frequency by alert category Bar chart.
- Camera node activity and sensor uptime telemetry.
- Date filters: **Today (24h)**, **Past 7 Days**, **Past 30 Days**.

### 8. **Command Operators & User Directory (`/users`)**
- Role-Based Access Control (RBAC): `ADMIN`, `COMMANDER`, `OPERATOR`, `VIEWER`.
- Add command user modal and 2FA hardware key indicators.

### 9. **System Security & Operational Audit Logs (`/audit-logs`)**
- Tamper-proof audit journal tracking user logins, camera configurations, alert acknowledgments, and biometric mutations.
- CSV export capability.

### 10. **Platform & Defense Configuration (`/settings`)**
- Edge compute hardware settings, Web Audio siren toggles, YOLOv8 confidence hyperparameters, and Supabase connection indicators.

### 11. **Secure Login Portal (`/login`)**
- Role preset switcher for rapid Smart India Hackathon demonstrations.
- Seamless dual-mode authentication (Local Mock Auth & Live Supabase Auth).

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## 🗄️ Supabase Configuration (Optional)

Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
*Note: If credentials are not provided, IBVAP automatically operates in high-fidelity mock mode with local state persistence.*

---

## 🏆 Smart India Hackathon (SIH) Demo Features
- **Simulate AI Alarm button**: Located in the sidebar and top ribbons to trigger instantaneous real-time critical breach simulations for jury demonstrations.
- **Role switcher**: Test Admin, Commander, Operator, and Viewer permissions on the fly from the login screen.
- **Synthesized Acoustic Siren**: Realistic alarm sounds using Web Audio API without external audio file latency.
