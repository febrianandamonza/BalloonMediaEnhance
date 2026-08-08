from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from database.database import get_db

from dependencies.authorization import require_roles

from services.location_service import LocationService

from schemas.location_schema import (
    LocationCreateRequest,
    LocationUpdateRequest,
    LocationResponse
)

router = APIRouter(

    prefix="/api/v1/locations",

    tags=["Locations"]


)

service = LocationService()


@router.get(
    "",
    response_model=list[LocationResponse],
    dependencies=[
        Depends(require_roles("Admin", "Operator"))
    ]
)
def get_all(
    db: Session = Depends(get_db)
):

    return service.get_all(db)


@router.get(
    "/{location_id}",
    response_model=LocationResponse,
    dependencies=[
        Depends(require_roles("Admin", "Operator"))
    ]
)
def get_by_id(
    location_id: int,
    db: Session = Depends(get_db)
):

    return service.get_by_id(
        db,
        location_id
    )


@router.post(
    "",
    response_model=LocationResponse,
    dependencies=[
        Depends(require_roles("Admin"))
    ]
)
def create(
    request: LocationCreateRequest,
    db: Session = Depends(get_db)
):

    return service.create(
        db,
        request
    )


@router.put(
    "/{location_id}",
    response_model=LocationResponse,
    dependencies=[
        Depends(require_roles("Admin"))
    ]
)
def update(
    location_id: int,
    request: LocationUpdateRequest,
    db: Session = Depends(get_db)
):

    return service.update(
        db,
        location_id,
        request
    )


@router.delete(
    "/{location_id}",
    dependencies=[
        Depends(require_roles("Admin"))
    ]
)
def delete(
    location_id: int,
    db: Session = Depends(get_db)
):

    service.delete(
        db,
        location_id
    )

    return {
        "message": "Location deleted successfully."
    }