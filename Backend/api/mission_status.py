from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from database.database import get_db

from dependencies.authorization import require_roles

from services.mission_status_service import MissionStatusService

from schemas.mission_status_schema import (
    MissionStatusCreateRequest,
    MissionStatusUpdateRequest,
    MissionStatusResponse
)

router = APIRouter(

    prefix="/api/v1/mission-status",

    tags=["Mission Status"]

)

service = MissionStatusService()


@router.get(
    "",
    response_model=list[MissionStatusResponse],
    dependencies=[
        Depends(
            require_roles(
                "Admin",
                "Operator"
            )
        )
    ]
)
def get_all(

    db: Session = Depends(get_db)

):

    return service.get_all(db)


@router.get(
    "/{status_id}",
    response_model=MissionStatusResponse,
    dependencies=[
        Depends(
            require_roles(
                "Admin",
                "Operator"
            )
        )
    ]
)
def get_by_id(

    status_id: int,

    db: Session = Depends(get_db)

):

    return service.get_by_id(
        db,
        status_id
    )


@router.post(
    "",
    response_model=MissionStatusResponse,
    dependencies=[
        Depends(
            require_roles(
                "Admin"
            )
        )
    ]
)
def create(

    request: MissionStatusCreateRequest,

    db: Session = Depends(get_db)

):

    return service.create(
        db,
        request
    )


@router.put(
    "/{status_id}",
    response_model=MissionStatusResponse,
    dependencies=[
        Depends(
            require_roles(
                "Admin"
            )
        )
    ]
)
def update(

    status_id: int,

    request: MissionStatusUpdateRequest,

    db: Session = Depends(get_db)

):

    return service.update(
        db,
        status_id,
        request
    )


@router.delete(
    "/{status_id}",
    dependencies=[
        Depends(
            require_roles(
                "Admin"
            )
        )
    ]
)
def delete(

    status_id: int,

    db: Session = Depends(get_db)

):

    service.delete(
        db,
        status_id
    )

    return {
        "message": "Mission Status deleted successfully."
    }