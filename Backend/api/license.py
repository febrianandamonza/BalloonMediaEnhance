from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from database.database import get_db

from services.license_service import LicenseService

from schemas.license_schema import (
    LicenseCreateRequest,
    LicenseUpdateRequest,
    LicenseResponse
)

from dependencies.authorization import require_roles

router = APIRouter(
    prefix="/api/v1/licenses",
    tags=["Licenses"]
)

service = LicenseService()


@router.get(
    "",
    response_model=list[LicenseResponse],
    dependencies=[
            Depends(require_roles("Admin", "Operator"))
        ]
)
def get_all(
    db: Session = Depends(get_db)
):
    return service.get_all(db)


@router.get(
    "/{license_id}",
    response_model=LicenseResponse,
    dependencies=[
            Depends(require_roles("Admin", "Operator"))
        ]
)
def get_by_id(
    license_id: UUID,
    db: Session = Depends(get_db)
):

    entity = service.get_by_id(
        db,
        license_id
    )

    if not entity:

        raise HTTPException(
            status_code=404,
            detail="License not found."
        )

    return entity


@router.post(
    "",
    response_model=LicenseResponse,
    dependencies=[
            Depends(require_roles("Admin"))
        ]
)
def create(
    request: LicenseCreateRequest,
    db: Session = Depends(get_db)
):

    return service.create(
        db,
        request
    )


@router.put(
    "/{license_id}",
    response_model=LicenseResponse,
    dependencies=[
            Depends(require_roles("Admin"))
        ]
)
def update(
    license_id: UUID,
    request: LicenseUpdateRequest,
    db: Session = Depends(get_db)
):

    return service.update(
        db,
        license_id,
        request
    )


@router.delete(
    "/{license_id}",
    dependencies=[
            Depends(require_roles("Admin"))
        ]
)
def delete(
    license_id: UUID,
    db: Session = Depends(get_db)
):

    service.soft_delete(
        db,
        license_id
    )

    return {
        "message": "License deleted successfully."
    }