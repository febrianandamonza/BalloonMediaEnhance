from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import Request

from sqlalchemy.orm import Session

from database.database import get_db

from dependencies.authorization import require_roles

from entities.user import User


from services.flight_information_service import FlightInformationService

from schemas.flight_information_schema import (
    FlightInformationCreateRequest,
    FlightInformationUpdateRequest,
    FlightInformationResponse
)

router = APIRouter(
    prefix="/api/v1/flight-information",
    tags=["Flight Information"]
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

    http_request: Request,

    request: FlightInformationCreateRequest,

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
    "/{information_id}",
    response_model=FlightInformationResponse
)
def update(

    information_id: UUID,

    http_request: Request,

    request: FlightInformationUpdateRequest,

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

        information_id=information_id,

        http_request=http_request,

        current_user=current_user,

        request=request

    )


@router.delete(
    "/{information_id}"
)
def delete(

    information_id: UUID,

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

        information_id=information_id,

        http_request=http_request,

        current_user=current_user

    )

    return {
        "message": "Flight Information deleted successfully."
    }