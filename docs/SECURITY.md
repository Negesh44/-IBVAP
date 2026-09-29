# IBVAP — Security Architecture & Access Control

**Platform**: Intelligent Border Video Analytics Platform (IBVAP)  
**Document Version**: 1.0.0  
**Evaluation**: Smart India Hackathon (SIH 2026)  

---

## 1. Security Philosophy & Defense-in-Depth

IBVAP enforces defense-in-depth security across four distinct platform layers:
1. **Frontend UI Tier**: Route guards, role-based component rendering, and action masking.
2. **FastAPI Gateway Tier**: Bearer JWT token verification, claim parsing, role dependencies, input sanitization, and security response headers.
3. **Database Tier**: Supabase PostgreSQL Row-Level Security (RLS) policies enforcing fine-grained row access control at the engine level.
4. **Storage Tier**: Private storage buckets accessible strictly via temporary authenticated signed URLs.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Action / Capability | `ADMIN` | `COMMANDER` | `OPERATOR` | `VIEWER` |
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

## 3. Row-Level Security (RLS) Policies

All core operational tables have RLS enabled:
- **`profiles`**: Users can read their own profile; `ADMIN` and `COMMANDER` can read all profiles; `ADMIN` only can update roles.
- **`friendly_persons`**: All roles can read whitelist; `ADMIN` and `COMMANDER` can enroll/update; `ADMIN` only can delete biometric profiles.
- **`cameras`**: All authenticated roles can read camera statuses (with RTSP passwords masked); `COMMANDER` and `ADMIN` can register/modify cameras and virtual fences; `ADMIN` only can delete cameras.
- **`alerts`**: All roles can read alerts; `OPERATOR`, `COMMANDER`, and `ADMIN` can update status (`ACKNOWLEDGED`, `RESOLVED`); `VIEWER` is strictly read-only.
- **`audit_logs`**: `COMMANDER` and `ADMIN` can read audit logs; **`UPDATE` and `DELETE` policies are permanently revoked**, ensuring an append-only, tamper-evident audit ledger.

---

## 4. API & Ingestion Security Measures

### 4.1 Bearer JWT Verification
FastAPI dependencies in [`backend/auth/dependencies.py`](file:///c:/Users/DELL/Desktop/sih%202/backend/auth/dependencies.py) validate all incoming Bearer tokens:
- Inspects cryptographic structure, claims, and token expiration (`exp`).
- Extracts `user_id`, `email`, `role`, `department`, and `badge_number`.
- Rejects missing, malformed, or expired tokens with `HTTP 401 Unauthorized`.
- Blocks unauthorized role actions with `HTTP 403 Forbidden`.

### 4.2 Credential Isolation
- **`SUPABASE_SERVICE_ROLE_KEY`**: Kept exclusively server-side in `backend/.env`. Never transmitted to the client, frontend code, or public responses.
- **RTSP Password Masking**: Camera records returned via `GET /api/cameras` have raw RTSP credentials stripped before sending JSON responses to browsers.

### 4.3 Secure File Uploads
Image uploads for face recognition, friendly enrollment, and detection inference are validated via [`backend/utils/security_validation.py`](file:///c:/Users/DELL/Desktop/sih%202/backend/utils/security_validation.py):
- **Magic Byte Verification**: Rejects executable binaries disguised as images (verifies JPEG, PNG, and WEBP signatures).
- **MIME Type Whitelist**: Restricts to `image/jpeg`, `image/png`, `image/webp`.
- **Payload Size Clamping**: Strictly enforces a 10MB maximum file size.
- **UUID Filename Sanitization**: Uploaded files receive server-generated UUID filenames to prevent directory traversal or remote code execution.

### 4.4 Identifier Sanitization
Camera IDs and input slugs are validated against regex `^[A-Za-z0-9_-]{3,32}$` to prevent path traversal and SQL injection attempts.

### 4.5 Security Response Headers
The FastAPI middleware injects standard security headers onto all HTTP responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
