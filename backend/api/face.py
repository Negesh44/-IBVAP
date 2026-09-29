from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException, status, Depends
from typing import Optional, Dict, Any
from models.schemas import FaceRecognitionResponse, FaceRegisterResponse
from face.face_service import face_service
from services.supabase_service import supabase_service
from auth.dependencies import get_current_user, require_commander, require_admin, CurrentUser
from utils.security_validation import validate_image_upload, sanitize_filename

router = APIRouter(prefix="/api/face", tags=["Biometric Face Recognition"])


@router.post("/recognize", response_model=FaceRecognitionResponse, summary="Recognize faces and match against Friendly Persons whitelist")
async def recognize_face(
    file: UploadFile = File(..., description="CCTV Image frame containing human face(s)"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Processes video/image frames to detect human faces, computes normalized 512-D embeddings,
    and performs cosine biometric matching against authorized Friendly Persons in Supabase.
    
    Security & Safety Guardrails:
    - Requires authenticated credentials.
    - Only persons with status='FRIENDLY' participate in matching.
    - Unknown persons are NOT automatically classified as threats.
    - Service role keys and raw embedding vectors are never returned to client.
    """
    image_bytes = await file.read()
    validate_image_upload(image_bytes, filename=file.filename, content_type=file.content_type, max_size_mb=10)

    try:
        result = face_service.recognize_frame(image_bytes=image_bytes)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Face recognition input error: {ve}")
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Face model weights not found: {fnf}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Face recognition processing error: {e}")


@router.post("/register/{person_id}", response_model=FaceRegisterResponse, summary="Enroll/register Friendly Person face biometric embedding")
async def register_friendly_person_face(
    person_id: str,
    file: UploadFile = File(..., description="Clear portrait/enrollment photo of authorized personnel"),
    person_name: str = Form("Authorized Personnel", description="Name of the friendly personnel"),
    department: str = Form("Border Defense Unit", description="Assigned unit / department"),
    current_user: CurrentUser = Depends(require_commander)
):
    """
    Enrolls a new or existing friendly person into the biometric database.
    Requires ADMIN or COMMANDER privileges (OPERATOR / VIEWER forbidden).
    """
    image_bytes = await file.read()
    validate_image_upload(image_bytes, filename=file.filename, content_type=file.content_type, max_size_mb=10)

    try:
        result = face_service.register_person_face(
            person_id=person_id,
            image_bytes=image_bytes,
            person_name=person_name,
            department=department
        )

        supabase_service.create_audit_log(
            action="FRIENDLY_PERSON_CREATED",
            category="BIOMETRIC",
            record_id=person_id,
            details=f"Friendly person '{person_name}' ({person_id}) biometric vector enrolled by {current_user.name}",
            user_name=current_user.name,
            user_role=current_user.role
        )

        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Biometric enrollment failed: {e}")


@router.delete("/friendly/{person_id}", summary="Delete/de-enroll friendly person")
async def delete_friendly_person(
    person_id: str,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    De-enrolls a friendly person from biometric recognition whitelist.
    Requires ADMIN privileges.
    """
    if supabase_service.is_connected and supabase_service.client:
        try:
            supabase_service.client.table("friendly_persons").delete().eq("id", person_id).execute()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to delete friendly person: {e}")

    supabase_service.create_audit_log(
        action="FRIENDLY_PERSON_DELETED",
        category="BIOMETRIC",
        record_id=person_id,
        details=f"Friendly person record '{person_id}' deleted by Admin {current_user.name}",
        user_name=current_user.name,
        user_role=current_user.role
    )

    return {"status": "SUCCESS", "message": f"Friendly person '{person_id}' deleted."}
