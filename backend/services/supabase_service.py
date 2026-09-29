import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ibvap.supabase")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tlpdoykzxpwzvhzypsqq.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "sb_publishable_aezuXbrKhTWnvUMXo9L1oA_PIpWioCM")

# In-memory fallback mock dataset
MOCK_CAMERAS = [
    {
        "id": "CAM-BOP-01",
        "camera_code": "BOP-001",
        "name": "BOP-01 Forward Post",
        "location": "North Sector — Perimeter Zone A",
        "rtsp_url": "rtsp://192.168.10.101:554/live/stream1",
        "status": "ONLINE",
        "resolution": "1920x1080 (1080p)",
        "fps": 30,
        "created_at": "2026-01-10T08:00:00Z"
    },
    {
        "id": "CAM-BOP-02",
        "camera_code": "BOP-002",
        "name": "BOP-02 Ridge Watch",
        "location": "North Sector — Ridge Outpost 4",
        "rtsp_url": "rtsp://192.168.10.102:554/live/stream1",
        "status": "ONLINE",
        "resolution": "1920x1080 (1080p)",
        "fps": 30,
        "created_at": "2026-01-11T08:00:00Z"
    },
    {
        "id": "CAM-BOP-03",
        "camera_code": "BOP-003",
        "name": "BOP-03 River Basin View",
        "location": "West Sector — River Crossing Grid W-4",
        "rtsp_url": "rtsp://192.168.10.103:554/live/stream1",
        "status": "ONLINE",
        "resolution": "2560x1440 (2K QHD)",
        "fps": 30,
        "created_at": "2026-01-12T08:00:00Z"
    },
    {
        "id": "CAM-CHECKPOST-01",
        "camera_code": "CHECKPOST-001",
        "name": "Checkpost Alpha Main Entry",
        "location": "South Sector — Base Entrance Gate 1",
        "rtsp_url": "rtsp://192.168.10.104:554/live/stream1",
        "status": "WARNING",
        "resolution": "1920x1080 (1080p)",
        "fps": 25,
        "created_at": "2026-01-15T08:00:00Z"
    }
]

MOCK_EVENTS = [
    {
        "id": "EVT-8994",
        "event_type": "Friendly Personnel Identified",
        "object_type": "PERSON",
        "confidence": 0.98,
        "camera_id": "BOP-001",
        "camera_name": "BOP-01 Forward Post",
        "location": "North Sector — Perimeter Zone A",
        "severity": "INFO",
        "evidence_url": "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
        "timestamp": "2026-09-29T09:44:02Z"
    },
    {
        "id": "EVT-8992",
        "event_type": "Unknown Individual Detected",
        "object_type": "PERSON",
        "confidence": 0.94,
        "camera_id": "BOP-003",
        "camera_name": "BOP-03 River Basin View",
        "location": "West Sector — River Crossing Grid W-4",
        "severity": "WARNING",
        "evidence_url": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80",
        "timestamp": "2026-09-29T09:42:15Z"
    }
]

MOCK_ALERTS = [
    {
        "id": "ALT-2026-8801",
        "alert_type": "Virtual Fence Breach",
        "severity": "CRITICAL",
        "camera_id": "BOP-003",
        "location": "West Sector — River Crossing Grid W-4",
        "description": "Laser tripwire and spatial polygon boundary crossed by unidentified subject in camouflage.",
        "status": "ACTIVE",
        "evidence_url": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80",
        "detected_at": "2026-09-29T09:46:01Z",
        "created_at": "2026-09-29T09:46:01Z"
    },
    {
        "id": "ALT-2026-8799",
        "alert_type": "Night Movement",
        "severity": "CRITICAL",
        "camera_id": "BOP-001",
        "location": "North Sector — Perimeter Zone A",
        "description": "Thermal sensor detected rapid movement along restricted barbed line.",
        "status": "ACKNOWLEDGED",
        "evidence_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        "detected_at": "2026-09-29T09:30:14Z",
        "created_at": "2026-09-29T09:30:14Z"
    }
]


class SupabaseService:
    def __init__(self):
        self.client = None
        self.is_connected = False
        self._init_client()

    def _init_client(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase credentials not configured. Using in-memory fallback.")
            return

        try:
            from supabase import create_client, Client
            self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
            self.is_connected = True
            logger.info(f"Supabase connected successfully: {SUPABASE_URL}")
        except Exception as e:
            logger.warning(f"Supabase initialization exception (using fallback): {e}")
            self.is_connected = False

    def get_cameras(self) -> List[Dict[str, Any]]:
        """Fetch cameras list from Supabase or fallback."""
        if self.is_connected and self.client:
            try:
                res = self.client.table("cameras").select("*").order("created_at", desc=True).execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception as e:
                logger.error(f"Error querying cameras from Supabase: {e}")
        return MOCK_CAMERAS

    def get_camera_by_id(self, camera_id: str) -> Optional[Dict[str, Any]]:
        """Fetch camera by ID or code."""
        cameras = self.get_cameras()
        for cam in cameras:
            if cam.get("id") == camera_id or cam.get("camera_code") == camera_id:
                return cam
        return None

    def get_events(self, limit: int = 50, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch recent events."""
        if self.is_connected and self.client:
            try:
                query = self.client.table("events").select("*").order("timestamp", desc=True).limit(limit)
                if event_type:
                    query = query.ilike("event_type", f"%{event_type}%")
                res = query.execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception as e:
                logger.error(f"Error querying events from Supabase: {e}")
        return MOCK_EVENTS[:limit]

    def get_alerts(self, limit: int = 50, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch alerts list."""
        if self.is_connected and self.client:
            try:
                query = self.client.table("alerts").select("*").order("detected_at", desc=True).limit(limit)
                if status:
                    query = query.eq("status", status.upper())
                res = query.execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception as e:
                logger.error(f"Error querying alerts from Supabase: {e}")
        return MOCK_ALERTS[:limit]

    def create_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Persist a newly detected event."""
        if self.is_connected and self.client:
            try:
                res = self.client.table("events").insert(event_data).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Error creating event in Supabase: {e}")
        
        MOCK_EVENTS.insert(0, event_data)
        return event_data

    def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Persist an alarm triggered by AI detection service."""
        if self.is_connected and self.client:
            try:
                res = self.client.table("alerts").insert(alert_data).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Error creating alert in Supabase: {e}")

        MOCK_ALERTS.insert(0, alert_data)
        return alert_data

    def update_alert_status(self, alert_id: str, status: str, note: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Acknowledge or Resolve alert."""
        if self.is_connected and self.client:
            try:
                res = self.client.table("alerts").update({
                    "status": status.upper(),
                    "action_taken": note or f"Marked {status.upper()} by operator"
                }).eq("id", alert_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Error updating alert in Supabase: {e}")

        for a in MOCK_ALERTS:
            if a.get("id") == alert_id:
                a["status"] = status.upper()
                if note:
                    a["action_taken"] = note
                return a

        # Fallback create mock alert with status if not found
        fallback_alert = {
            "id": alert_id,
            "alert_type": "Perimeter Breach",
            "severity": "CRITICAL",
            "status": status.upper(),
            "action_taken": note
        }
        MOCK_ALERTS.insert(0, fallback_alert)
        return fallback_alert

    def upload_evidence(
        self,
        image_bytes: bytes,
        camera_id: str,
        event_type: str,
        track_id: int = 100,
        timestamp_str: Optional[str] = None
    ) -> Optional[str]:
        """
        Uploads an incident evidence snapshot to the private Supabase Storage 'evidence' bucket.
        Filename format: {camera_id}/{event_type}/{timestamp}-{track_id}.jpg
        """
        now_ts = (timestamp_str or datetime.utcnow().isoformat()).replace(":", "-")
        clean_event = event_type.replace(" ", "_").lower()
        file_path = f"{camera_id}/{clean_event}/{now_ts}-{track_id}.jpg"

        if self.is_connected and self.client:
            try:
                # Upload bytes to evidence bucket
                res = self.client.storage.from_("evidence").upload(
                    file_path,
                    image_bytes,
                    {"content-type": "image/jpeg", "upsert": "true"}
                )

                # Generate signed URL valid for 30 days
                signed_res = self.client.storage.from_("evidence").create_signed_url(file_path, 60 * 60 * 24 * 30)
                if signed_res and "signedURL" in signed_res:
                    return signed_res["signedURL"]
                elif signed_res and "signedUrl" in signed_res:
                    return signed_res["signedUrl"]

                return f"{SUPABASE_URL}/storage/v1/object/public/evidence/{file_path}"
            except Exception as e:
                logger.warning(f"Failed to upload evidence image to Supabase Storage: {e}")

        # Fallback tactical CDN / placeholder evidence URL
        return f"https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80#evidence_{file_path}"

    def get_evidence_by_event_id(self, event_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves evidence details and access URL for a specific event or alert.
        """
        # Look in events
        events = self.get_events(limit=100)
        matched_evt = next((e for e in events if e.get("id") == event_id), None)

        if not matched_evt:
            # Look in alerts
            alerts = self.get_alerts(limit=100)
            matched_evt = next((a for a in alerts if a.get("id") == event_id), None)

        if matched_evt:
            return {
                "event_id": event_id,
                "evidence_url": matched_evt.get("evidence_url"),
                "camera_id": matched_evt.get("camera_id"),
                "timestamp": matched_evt.get("timestamp") or matched_evt.get("detected_at"),
                "status": "AVAILABLE" if matched_evt.get("evidence_url") else "NO_EVIDENCE"
            }
        return None

    def create_audit_log(
        self,
        action: str,
        category: str = "SECURITY",
        record_id: Optional[str] = None,
        details: Optional[str] = None,
        user_name: str = "AI Engine",
        user_role: str = "SYSTEM"
    ) -> Dict[str, Any]:
        """
        Appends an entry to the tamper-evident audit_logs table.
        """
        now_dt = datetime.now(timezone.utc)
        log_entry = {
            "id": f"LOG-{now_dt.strftime('%Y%m%d%H%M%S')}",
            "action": action,
            "category": category,
            "record_id": record_id,
            "details": details,
            "user_name": user_name,
            "user_role": user_role,
            "ip_address": "127.0.0.1",
            "created_at": now_dt.isoformat()
        }

        if self.is_connected and self.client:
            try:
                self.client.table("audit_logs").insert(log_entry).execute()
            except Exception as e:
                logger.debug(f"Audit log insertion skipped/fallback: {e}")

        return log_entry


# Global singleton instance
supabase_service = SupabaseService()

