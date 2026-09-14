from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import Form
from fastapi import Request
from fastapi import UploadFile

from sqlalchemy.orm import Session

from database.database import get_db

from dependencies.authorization import require_roles

from entities.user import User

from schemas.media_schema import (

    MediaSaveRequest,

    MediaResponse

)

from services.media_service import MediaService

router = APIRouter(
    prefix="/api/v1/media",
    tags=["Media"]
)

service = MediaService()

@router.get(
    "",
    response_model=list[MediaResponse]
)
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin",
            "Operator"
        )
    )
):
    return service.get_all(db=db)

@router.post(
    "",
    response_model=MediaResponse
)
def save(
    http_request: Request,
    request: MediaSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin",
            "Operator"
        )
    )
):
    return service.save(
        db=db,
        http_request=http_request,
        current_user=current_user,
        request=request
    )

@router.post(
    "/upload",
    response_model=list[MediaResponse]
)
def upload(
    http_request: Request,
    flight_information_id: UUID = Form(...),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin",
            "Operator"
        )
    )
):
    return service.upload(
        db=db,
        http_request=http_request,
        current_user=current_user,
        flight_information_id=flight_information_id,
        files=files
    )

@router.delete(
    "/{media_id}"
)
def delete(
    media_id: UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin",
            "Operator"
        )
    )
):
    service.delete(
        db=db,
        media_id=media_id,
        http_request=http_request,
        current_user=current_user
    )

    return {
        "message": "Media deleted successfully."
    }