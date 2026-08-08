from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from database.database import get_db

from dependencies.authentication import get_current_user
from dependencies.authorization import require_roles

from entities.user import User

from schemas.flight_simulation_schema import (
    FlightSimulationCreateRequest,
    FlightSimulationUpdateRequest,
    FlightSimulationResponse
)

from services.flight_simulation_service import FlightSimulationService


router = APIRouter(

    prefix="/api/v1/flight-simulations",

    tags=["Flight Simulations"],

    dependencies=[
        Depends(
            require_roles(
                "Admin",
                "Operator"
            )
        )
    ]
)

service = FlightSimulationService()


@router.get(
    "",
    response_model=list[FlightSimulationResponse]
)
def get_all(
    db: Session = Depends(get_db)
):

    return service.get_all(db)


@router.get(
    "/{simulation_id}",
    response_model=FlightSimulationResponse
)
def get_by_id(
    simulation_id: UUID,
    db: Session = Depends(get_db)
):

    return service.get_by_id(
        db,
        simulation_id
    )



@router.post(
    "",
    response_model=FlightSimulationResponse
)
def create(
    request: FlightSimulationCreateRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    )
):

    return service.create(
        db,
        request,
        current_user
    )

@router.put(
    "/{simulation_id}",
    response_model=FlightSimulationResponse
)
def update(
    simulation_id: UUID,

    request: FlightSimulationUpdateRequest,

    db: Session = Depends(get_db)
):

    return service.update(
        db,
        simulation_id,
        request
    )

@router.delete(
    "/{simulation_id}"
)
def delete(
    simulation_id: UUID,

    db: Session = Depends(get_db)
):

    service.delete(
        db,
        simulation_id
    )

    return {
        "message": "Flight Simulation deleted successfully."
    }


