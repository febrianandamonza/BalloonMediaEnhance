from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from database.database import get_db

from dependencies.authorization import require_roles

from services.balloon_service import BalloonService

from schemas.balloon_schema import (
    BalloonCreateRequest,
    BalloonUpdateRequest,
    BalloonResponse
)

router = APIRouter(

    prefix="/api/v1/balloons",

    tags=["Balloons"]

)

service = BalloonService()


@router.get(
    "",
    response_model=list[BalloonResponse],
    dependencies=[
        Depends(require_roles("Admin", "Operator"))
    ]
)
def get_all(
    db: Session = Depends(get_db)
):

    return service.get_all(db)


@router.get(
    "/{balloon_id}",
    response_model=BalloonResponse,
    dependencies=[
        Depends(require_roles("Admin", "Operator"))
    ]
)
def get_by_id(
    balloon_id: UUID,
    db: Session = Depends(get_db)
):

    return service.get_by_id(
        db,
        balloon_id
    )


@router.post(
    "",
    response_model=BalloonResponse,
    dependencies=[
        Depends(require_roles("Admin"))
    ]
)
def create(
    request: BalloonCreateRequest,
    db: Session = Depends(get_db)
):

    return service.create(
        db,
        request
    )


@router.put(
    "/{balloon_id}",
    response_model=BalloonResponse,
    dependencies=[
        Depends(require_roles("Admin"))
    ]
)
def update(
    balloon_id: UUID,
    request: BalloonUpdateRequest,
    db: Session = Depends(get_db)
):

    return service.update(
        db,
        balloon_id,
        request
    )


@router.delete(
    "/{balloon_id}",
    dependencies=[
        Depends(require_roles("Admin"))
    ]
)
def delete(
    balloon_id: UUID,
    db: Session = Depends(get_db)
):

    service.delete(
        db,
        balloon_id
    )

    return {
        "message": "Balloon deleted successfully."
    }