from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import Request

from sqlalchemy.orm import Session

from database.database import get_db

from dependencies.authentication import get_current_user
from dependencies.authorization import require_roles

from entities.user import User

from services.flight_mission_service import FlightMissionService

from schemas.flight_mission_schema import (
    FlightMissionCreateRequest,
    FlightMissionUpdateRequest,
    FlightMissionResponse
)

router = APIRouter(

    prefix="/api/v1/flight-missions",

    tags=["Flight Missions"]
)

service = FlightMissionService()

@router.get(
    "",
    response_model=list[FlightMissionResponse]
)
def get_all(
    db: Session = Depends(get_db)
):

    return service.get_all(db)

@router.get(
    "/{mission_id}",
    response_model=FlightMissionResponse
)
def get_by_id(
    mission_id: UUID,
    db: Session = Depends(get_db)
):

    return service.get_by_id(
        db,
        mission_id
    )

@router.post(
    "",
    response_model=FlightMissionResponse
)
def create(

    http_request: Request,

    request: FlightMissionCreateRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "Admin",
            "Operator"
        )
    )

):

    return service.create(

        db=db,

        http_request=http_request,

        request=request,

        current_user=current_user

    )


@router.put(
    "/{mission_id}",
    response_model=FlightMissionResponse
)
def update(

    mission_id: UUID,

    http_request: Request,

    request: FlightMissionUpdateRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "Admin",
            "Operator"
        )
    )

):

    return service.update(

        db=db,

        mission_id=mission_id,

        http_request=http_request,

        current_user=current_user,

        request=request

    )

@router.delete(
    "/{mission_id}"
)
def delete(

    mission_id: UUID,

    http_request: Request,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "Admin"
        )
    )

):

    service.delete(

        db=db,

        mission_id=mission_id,

        http_request=http_request,

        current_user=current_user

    )

    return {
        "message": "Flight Mission deleted successfully."
    }