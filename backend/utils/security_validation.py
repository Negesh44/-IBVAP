import os
import re
import uuid
from typing import Optional, Set
from fastapi import HTTPException

# Allowed image MIME types & extensions
ALLOWED_IMAGE_MIMES: Set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/pjpeg"
}

ALLOWED_EXTENSIONS: Set[str] = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
}

DISALLOWED_EXTENSIONS: Set[str] = {
    ".exe", ".bat", ".sh", ".py", ".php", ".js", ".html", ".dll", ".so", ".bin"
}

# Safe camera code pattern e.g. BOP-001, CAM_NORTH_01
CAMERA_ID_REGEX = re.compile(r"^[A-Za-z0-9_-]{3,32}$")
UUID_REGEX = re.compile(r"^[0-9a-fA-F-]{36}$")


def validate_camera_id(camera_id: str) -> str:
    """Validates camera identifier against alphanumeric format to prevent injection."""
    if not camera_id or not isinstance(camera_id, str):
        raise HTTPException(status_code=400, detail="Invalid camera identifier: Identifier is required.")
    
    clean_id = camera_id.strip()
    if not CAMERA_ID_REGEX.match(clean_id):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid camera identifier '{clean_id}'. Must be 3-32 alphanumeric characters, dashes or underscores."
        )
    return clean_id


def sanitize_filename(original_name: Optional[str] = None) -> str:
    """Generates an unguessable safe server-side filename with valid extension."""
    ext = ".jpg"
    if original_name:
        _, raw_ext = os.path.splitext(original_name)
        if raw_ext.lower() in ALLOWED_EXTENSIONS:
            ext = raw_ext.lower()
    return f"{uuid.uuid4().hex}{ext}"


def validate_image_upload(
    file_bytes: bytes,
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
    max_size_mb: int = 10
) -> None:
    """
    Validates uploaded file against MIME type, size limit, executable protection, and magic headers.
    """
    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    max_bytes = max_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file exceeds maximum size limit of {max_size_mb} MB (Received {len(file_bytes) / (1024*1024):.1f} MB)."
        )

    # Check file extension
    if filename:
        clean_name = os.path.basename(filename)
        _, ext = os.path.splitext(clean_name)
        ext_lower = ext.lower()
        if ext_lower in DISALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File extension '{ext}' is forbidden for upload.")
        if ext_lower not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File extension '{ext}' is not supported. Use JPG, PNG, or WEBP.")

    # Check content-type header if present
    if content_type:
        clean_mime = content_type.lower().split(";")[0].strip()
        if clean_mime not in ALLOWED_IMAGE_MIMES:
            raise HTTPException(status_code=400, detail=f"Invalid MIME content type '{content_type}'. Must be image/jpeg, image/png, or image/webp.")

    # Verify image magic bytes
    # JPEG: starts with \xFF\xD8
    # PNG: starts with \x89PNG\r\n\x1a\n
    # WEBP: starts with RIFF....WEBP
    is_jpeg = file_bytes.startswith(b"\xff\xd8")
    is_png = file_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    is_webp = file_bytes.startswith(b"RIFF") and len(file_bytes) > 12 and file_bytes[8:12] == b"WEBP"

    if not (is_jpeg or is_png or is_webp):
        raise HTTPException(
            status_code=400,
            detail="File content does not match valid JPEG, PNG, or WEBP image format signature."
        )


def validate_role(role_name: str) -> str:
    """Validates user RBAC role string."""
    valid = {"ADMIN", "COMMANDER", "OPERATOR", "VIEWER"}
    clean = role_name.strip().upper()
    if clean not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid role '{role_name}'. Must be one of {list(valid)}")
    return clean
