import os
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body

from auth.dependencies import require_commander, get_current_user, CurrentUser
from services.demo_service import demo_service

logger = logging.getLogger("ibvap.api.demo")

router = APIRouter(prefix="/api/demo", tags=["Demonstration Mode"])


@router.post("/start")
async def start_demonstration(
    video_path: Optional[str] = Body(None, embed=True),
    current_user: CurrentUser = Depends(require_commander)
):
    """
    Starts the live SIH Demonstration pipeline on DEMO-001.
    Authorized for ADMIN and COMMANDER roles.
    """
    logger.info(f"User {current_user.email} ({current_user.role}) initiated SIH Demonstration Mode.")
    result = demo_service.start_demo(video_path=video_path)
    if result.get("status") == "ERROR":
        raise HTTPException(status_code=500, detail=result.get("error", "Demo start failed"))
    return result


@router.post("/stop")
async def stop_demonstration(
    current_user: CurrentUser = Depends(require_commander)
):
    """
    Stops the SIH Demonstration pipeline on DEMO-001.
    Authorized for ADMIN and COMMANDER roles.
    """
    logger.info(f"User {current_user.email} ({current_user.role}) stopped SIH Demonstration Mode.")
    return demo_service.stop_demo()


@router.get("/status")
async def get_demonstration_status(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Returns real-time status and operational state of DEMO-001.
    Accessible to all authenticated tactical operators.
    """
    return demo_service.get_status()


@router.get("/metrics")
async def get_demonstration_metrics(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Calculates live input FPS, processing FPS, average inference/tracking times,
    frames processed, unique tracks, and events.
    """
    return demo_service.get_metrics()


@router.post("/reset")
async def reset_demonstration(
    current_user: CurrentUser = Depends(require_commander)
):
    """
    Stops demo mode, resets metrics and tracker state without modifying production records.
    Authorized for ADMIN and COMMANDER roles.
    """
    logger.info(f"User {current_user.email} ({current_user.role}) requested Demo reset.")
    return demo_service.reset_demo()
