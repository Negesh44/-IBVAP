import logging
from typing import List, Dict, Tuple, Optional, Any

logger = logging.getLogger("ibvap.virtual_fence")


def is_point_in_polygon(point: Tuple[float, float], polygon: List[List[float]]) -> bool:
    """
    Standard Ray-Casting algorithm for 2D Point-in-Polygon testing.
    Determines if point (px, py) is strictly inside polygon vertices [[x1, y1], [x2, y2], ...].
    """
    if not polygon or len(polygon) < 3:
        return False

    px, py = point
    inside = False
    n = len(polygon)

    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if py > min(p1y, p2y):
            if py <= max(p1y, p2y):
                if px <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (py - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or px <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside


class VirtualFenceManager:
    """
    Manages spatial perimeter zones and intrusion state transitions across CCTV cameras.
    """

    def __init__(self):
        # camera_id -> list of polygon vertices [[x, y], ...]
        self._camera_zones: Dict[str, List[List[float]]] = {}
        
        # State tracking: (camera_id, track_id) -> bool (is currently inside polygon)
        self._track_states: Dict[Tuple[str, int], bool] = {}

        # Pre-seed default defense perimeter zones for primary border cameras
        self._seed_default_zones()

    def _seed_default_zones(self):
        """Default tactical polygon zones for standard 1920x1080 resolution."""
        # Camera BOP-001 (Forward Post): Central restricted border lane
        self._camera_zones["BOP-001"] = [
            [100, 100],
            [500, 100],
            [500, 400],
            [100, 400]
        ]
        # Camera BOP-002: Ridge Watch restricted zone
        self._camera_zones["BOP-002"] = [
            [200, 300],
            [800, 300],
            [800, 700],
            [200, 700]
        ]
        # Camera BOP-003: River crossing boundary
        self._camera_zones["BOP-003"] = [
            [150, 200],
            [750, 200],
            [750, 600],
            [150, 600]
        ]

    def set_camera_zone(self, camera_id: str, zone_polygon: List[List[float]]):
        """
        Configures or updates the spatial polygon zone for a specific camera.
        """
        if len(zone_polygon) < 3:
            raise ValueError("A virtual fence polygon requires at least 3 coordinate vertices.")
        self._camera_zones[camera_id] = zone_polygon
        logger.info(f"Updated virtual fence for camera '{camera_id}' with {len(zone_polygon)} vertices.")

    def get_camera_zone(self, camera_id: str) -> Optional[List[List[float]]]:
        """
        Retrieves configured polygon for camera.
        """
        return self._camera_zones.get(camera_id)

    def get_track_reference_point(self, bbox: List[int]) -> Tuple[float, float]:
        """
        Extracts bottom-center reference point (ground contact point of person/vehicle) from [x1, y1, x2, y2].
        """
        x1, y1, x2, y2 = bbox
        center_x = (x1 + x2) / 2.0
        bottom_y = float(y2)
        return (center_x, bottom_y)

    def evaluate_track(
        self,
        camera_id: str,
        track_id: int,
        bbox: List[int],
        object_type: str = "person"
    ) -> Dict[str, Any]:
        """
        Evaluates whether a tracked target has penetrated the virtual fence.
        Returns state transitions:
          - is_inside: current state
          - state_transition: "ENTERED", "INSIDE", "LEFT", "OUTSIDE", "NO_ZONE"
          - reference_point: (x, y)
        """
        zone = self.get_camera_zone(camera_id)
        if not zone:
            return {
                "has_zone": False,
                "is_inside": False,
                "state_transition": "NO_ZONE",
                "reference_point": self.get_track_reference_point(bbox)
            }

        ref_point = self.get_track_reference_point(bbox)
        is_now_inside = is_point_in_polygon(ref_point, zone)

        key = (camera_id, track_id)
        was_inside = self._track_states.get(key, False)

        transition = "OUTSIDE"
        if not was_inside and is_now_inside:
            transition = "ENTERED"
        elif was_inside and is_now_inside:
            transition = "INSIDE"
        elif was_inside and not is_now_inside:
            transition = "LEFT"
        else:
            transition = "OUTSIDE"

        # Update state cache
        self._track_states[key] = is_now_inside

        return {
            "has_zone": True,
            "is_inside": is_now_inside,
            "was_inside": was_inside,
            "state_transition": transition,
            "reference_point": ref_point,
            "zone_polygon": zone
        }

    def reset_track(self, camera_id: str, track_id: int):
        """Removes a track from state cache."""
        self._track_states.pop((camera_id, track_id), None)

    def reset_camera(self, camera_id: str):
        """Clears all track states for a specific camera."""
        keys = [k for k in self._track_states.keys() if k[0] == camera_id]
        for k in keys:
            del self._track_states[k]


# Global singleton virtual fence manager
virtual_fence_manager = VirtualFenceManager()
