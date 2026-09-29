from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException, status
from typing import Optional
from models.schemas import FaceRecognitionResponse, FaceRegisterResponse
from face.face_service import face_service

router = APIRouter(prefix="/api/face", tags=["Biometric Face Recognition"])


@router.post("/recognize", response_model=FaceRecognitionResponse, summary="Recognize faces and match against Friendly Persons whitelist")
async def recognize_face(
    file: UploadFile = File(..., description="CCTV Image frame containing human face(s)")
):
    """
    Processes video/image frames to detect human faces, computes normalized 512-D embeddings,
    and performs cosine biometric matching against authorized Friendly Persons in Supabase.
    
    Security & Safety Guardrails:
    - Only persons with status='FRIENDLY' participate in matching.
    - Unknown persons are NOT automatically classified as threats.
    - Service role keys and raw embedding vectors are never returned to client.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        allowed_exts = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
        if not file.filename or not file.filename.lower().endswith(allowed_exts):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must be a valid image format (JPEG, PNG, WEBP, BMP)."
            )

    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image payload received."
            )

        result = face_service.recognize_frame(image_bytes=image_bytes)
        return result

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Face recognition input error: {ve}"
        )
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Face model weights not found: {fnf}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face recognition processing error: {e}"
        )


@router.post("/register/{person_id}", response_model=FaceRegisterResponse, summary="Enroll/register Friendly Person face biometric embedding")
async def register_friendly_person_face(
    person_id: str,
    file: UploadFile = File(..., description="Clear portrait/enrollment photo of authorized personnel"),
    person_name: str = Form("Authorized Personnel", description="Name of the friendly personnel"),
    department: str = Form("Border Defense Unit", description="Assigned unit / department")
):
    """
    Enrolls a new or existing friendly person into the biometric database.
    Generates a 512-dimensional embedding and securely registers it.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        allowed_exts = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
        if not file.filename or not file.filename.lower().endswith(allowed_exts):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must be a valid image format (JPEG, PNG, WEBP, BMP)."
            )

    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image payload received."
            )

        result = face_service.register_person_face(
            person_id=person_id,
            image_bytes=image_bytes,
            person_name=person_name,
            department=department
        )
        return result

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face registration error: {e}"
        )
