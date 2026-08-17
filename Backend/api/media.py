from fastapi import APIRouter
from fastapi import Depends
from fastapi import Request

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