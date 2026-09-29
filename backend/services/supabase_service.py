import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
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
                res = self.client.table("alerts").update({"status": status.upper()}).eq("id", alert_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Error updating alert in Supabase: {e}")

        for a in MOCK_ALERTS:
            if a.get("id") == alert_id:
                a["status"] = status.upper()
                return a
        return None


# Global singleton instance
supabase_service = SupabaseService()
