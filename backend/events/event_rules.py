import os
import time
import logging
from typing import Dict, Tuple, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("ibvap.event_rules")


class EventRulesConfig:
    """
    Centralized configurable rules and hyperparameter settings for IBVAP Event Detection.
    All thresholds are loaded from environment variables with safe tactical defaults.
    """
    LOITERING_THRESHOLD_SECONDS: float = float(os.getenv("LOITERING_THRESHOLD_SECONDS", 30.0))
    NIGHT_BRIGHTNESS_THRESHOLD: float = float(os.getenv("NIGHT_BRIGHTNESS_THRESHOLD", 50.0))
    STATIONARY_THRESHOLD_SECONDS: float = float(os.getenv("STATIONARY_THRESHOLD_SECONDS", 60.0))
    STATIONARY_DISPLACEMENT_PX: float = float(os.getenv("STATIONARY_DISPLACEMENT_PX", 30.0))
    EVENT_COOLDOWN_SECONDS: float = float(os.getenv("EVENT_COOLDOWN_SECONDS", 30.0))

    # Event Severities
    SEVERITY_INTRUSION: str = os.getenv("SEVERITY_INTRUSION", "CRITICAL").upper()
    SEVERITY_LOITERING: str = os.getenv("SEVERITY_LOITERING", "WARNING").upper()
    SEVERITY_NIGHT_MOVEMENT: str = os.getenv("SEVERITY_NIGHT_MOVEMENT", "WARNING").upper()
    SEVERITY_STATIONARY_PERSON: str = os.getenv("SEVERITY_STATIONARY_PERSON", "INFO").upper()

    @classmethod
    def get_severity(cls, event_type: str) -> str:
        type_upper = event_type.upper()
        if "INTRUSION" in type_upper or "VIRTUAL_FENCE" in type_upper:
            return cls.SEVERITY_INTRUSION
        elif "LOITERING" in type_upper:
            return cls.SEVERITY_LOITERING
        elif "NIGHT" in type_upper:
            return cls.SEVERITY_NIGHT_MOVEMENT
        elif "STATIONARY" in type_upper:
            return cls.SEVERITY_STATIONARY_PERSON
        return "INFO"


class EventCooldownTracker:
    """
    Prevents duplicate alerts from flooding operators every video frame.
    Debounces events using a cooldown period per (camera_id, track_id, event_type).
    """

    def __init__(self, default_cooldown_seconds: Optional[float] = None):
        self.default_cooldown = default_cooldown_seconds or EventRulesConfig.EVENT_COOLDOWN_SECONDS
        # Key: (camera_id, track_id, event_type) -> timestamp
        self._last_emitted: Dict[Tuple[str, int, str], float] = {}

    def is_in_cooldown(
        self,
        camera_id: str,
        track_id: int,
        event_type: str,
        current_time: Optional[float] = None,
        cooldown_seconds: Optional[float] = None
    ) -> bool:
        """
        Returns True if the event is currently suppressed by the debouncing cooldown.
        """
        now = current_time if current_time is not None else time.time()
        cd = cooldown_seconds if cooldown_seconds is not None else self.default_cooldown

        key = (camera_id, track_id, event_type)
        last_time = self._last_emitted.get(key)

        if last_time is None:
            return False

        if (now - last_time) < cd:
            return True

        return False

    def record_event(
        self,
        camera_id: str,
        track_id: int,
        event_type: str,
        current_time: Optional[float] = None
    ):
        """
        Registers that an event was successfully emitted, initiating its cooldown window.
        """
        now = current_time if current_time is not None else time.time()
        key = (camera_id, track_id, event_type)
        self._last_emitted[key] = now

    def reset(self, camera_id: Optional[str] = None):
        """
        Resets cooldown history for a specific camera or globally.
        """
        if camera_id is None:
            self._last_emitted.clear()
        else:
            keys_to_del = [k for k in self._last_emitted.keys() if k[0] == camera_id]
            for k in keys_to_del:
                del self._last_emitted[k]


# Global singleton cooldown manager
event_cooldown_tracker = EventCooldownTracker()
