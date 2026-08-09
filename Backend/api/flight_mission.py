from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends

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

    tags=["Flight Missions"],

    dependencies=[
        Depends(require_roles("Admin", "Operator"))
    ]
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

    request: FlightMissionCreateRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    return service.create(

        db,

        request,

        current_user

    )


@router.put(
    "/{mission_id}",
    response_model=FlightMissionResponse
)
def update(

    mission_id: UUID,

    request: FlightMissionUpdateRequest,

    db: Session = Depends(get_db)

):

    return service.update(

        db,

        mission_id,

        request

    )

@router.delete(
    "/{mission_id}"
)
def delete(

    mission_id: UUID,

    db: Session = Depends(get_db)

):

    service.delete(

        db,

        mission_id

    )

    return {
        "message": "Flight Mission deleted successfully."
    }
