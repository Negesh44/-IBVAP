from fastapi import APIRouter, Query
from typing import List, Optional
from models.schemas import DetectionItem
from services.detection_service import detection_service

router = APIRouter(prefix="/api/detections", tags=["Detections"])


@router.get("", response_model=List[DetectionItem], summary="Get live/recent object detections")
async def get_detections(
    camera_id: Optional[str] = Query(None, description="Filter by camera code e.g. BOP-001"),
    count: int = Query(4, ge=1, le=20, description="Number of recent detection frames")
):
    """
    Returns latest tracked object detections across cameras.
    Emits data matching the exact schema required for frontend rendering.
    """
    results = [detection_service.generate_simulated_detection(camera_id) for _ in range(count)]
    return results
