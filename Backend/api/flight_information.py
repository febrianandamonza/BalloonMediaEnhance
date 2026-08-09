from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from database.database import get_db

from dependencies.authorization import require_roles

from services.flight_information_service import FlightInformationService

from schemas.flight_information_schema import (
    FlightInformationCreateRequest,
    FlightInformationUpdateRequest,
    FlightInformationResponse
)

router = APIRouter(
    prefix="/api/v1/flight-information",
    tags=["Flight Information"],
    dependencies=[Depends(require_roles("Admin", "Operator"))]
)

service = FlightInformationService()


@router.get(
    "",
    response_model=list[FlightInformationResponse]
)
def get_all(
    db: Session = Depends(get_db)
):

    return service.get_all(db)


@router.get(
    "/{information_id}",
    response_model=FlightInformationResponse
)
def get_by_id(
    information_id: UUID,
    db: Session = Depends(get_db)
):

    return service.get_by_id(
        db,
        information_id
    )


@router.post(
    "",
    response_model=FlightInformationResponse
)
def create(
    request: FlightInformationCreateRequest,
    db: Session = Depends(get_db)
):

    return service.create(
        db,
        request
    )


@router.put(
    "/{information_id}",
    response_model=FlightInformationResponse
)
def update(
    information_id: UUID,
    request: FlightInformationUpdateRequest,
    db: Session = Depends(get_db)
):

    return service.update(
        db,
        information_id,
        request
    )


@router.delete(
    "/{information_id}"
)
def delete(
    information_id: UUID,
    db: Session = Depends(get_db)
):

    service.delete(
        db,
        information_id
    )

    return {
        "message": "Flight Information deleted successfully."
    }