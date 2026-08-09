from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from database.database import get_db

from services.user_license_service import UserLicenseService

from schemas.user_license_schema import (
    UserLicenseCreateRequest,
    UserLicenseResponse,
    UserLicenseUpdateRequest
)

from dependencies.authorization import require_roles

router = APIRouter(
    prefix="/api/v1/user-licenses",
    tags=["User Licenses"],
    dependencies=[
        Depends(require_roles("Admin"))
    ]
)

service = UserLicenseService()


@router.get(
    "",
    response_model=list[UserLicenseResponse],
    dependencies=[
            Depends(require_roles("Admin", "Operator"))
        ]
)
def get_all(
    db: Session = Depends(get_db)
):

    return service.get_all(db)


@router.get(
    "/{user_license_id}",
    response_model=UserLicenseResponse,
    dependencies=[
                Depends(require_roles("Admin", "Operator"))
            ]
)
def get_by_id(
    user_license_id: UUID,
    db: Session = Depends(get_db),
):

    return service.get_by_id(
        db,
        user_license_id
    )


@router.get(
    "/user/{user_id}",
    response_model=list[UserLicenseResponse],
    dependencies=[
                Depends(require_roles("Admin", "Operator"))
            ]
)
def get_by_user(
    user_id: UUID,
    db: Session = Depends(get_db)
):

    return service.get_by_user(
        db,
        user_id
    )


@router.post(
    "",
    response_model=UserLicenseResponse,
    dependencies=[
                Depends(require_roles("Admin", "Operator"))
            ]
)
def create(
    request: UserLicenseCreateRequest,
    db: Session = Depends(get_db)
):

    return service.create(
        db,
        request
    )


@router.put(
    "/{user_license_id}",
    response_model=UserLicenseResponse,
    dependencies=[
                Depends(require_roles("Admin"))
            ]
)
def update(
    user_license_id: UUID,
    request: UserLicenseUpdateRequest,
    db: Session = Depends(get_db)
):

    return service.update(
        db,
        user_license_id,
        request
    )


@router.delete(
    "/{user_license_id}",
    dependencies=[
                Depends(require_roles("Admin"))
            ]
)
def delete(
    user_license_id: UUID,
    db: Session = Depends(get_db)
):

    service.delete(
        db,
        user_license_id
    )

    return {
        "message": "User License deleted successfully."
    }