from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from database.database import get_db

from dependencies.authorization import require_roles

from services.audit_module_service import AuditModuleService

from schemas.audit_module_schema import (
    AuditModuleCreateRequest,
    AuditModuleUpdateRequest,
    AuditModuleResponse
)

router = APIRouter(
    prefix="/api/v1/audit-modules",
    tags=["Audit Modules"]
)

service = AuditModuleService()


@router.get(
    "",
    response_model=list[AuditModuleResponse],
    dependencies=[
        Depends(
            require_roles("Admin")
        )
    ]
)
def get_all(
    db: Session = Depends(get_db)
):

    return service.get_all(db)


@router.get(
    "/{module_id}",
    response_model=AuditModuleResponse,
    dependencies=[
        Depends(
            require_roles("Admin")
        )
    ]
)
def get_by_id(
    module_id: int,
    db: Session = Depends(get_db)
):

    return service.get_by_id(
        db,
        module_id
    )


@router.post(
    "",
    response_model=AuditModuleResponse,
    dependencies=[
        Depends(
            require_roles("Admin")
        )
    ]
)
def create(
    request: AuditModuleCreateRequest,
    db: Session = Depends(get_db)
):

    return service.create(
        db,
        request
    )


@router.put(
    "/{module_id}",
    response_model=AuditModuleResponse,
    dependencies=[
        Depends(
            require_roles("Admin")
        )
    ]
)
def update(
    module_id: int,
    request: AuditModuleUpdateRequest,
    db: Session = Depends(get_db)
):

    return service.update(
        db,
        module_id,
        request
    )


@router.delete(
    "/{module_id}",
    dependencies=[
        Depends(
            require_roles("Admin")
        )
    ]
)
def delete(
    module_id: int,
    db: Session = Depends(get_db)
):

    service.delete(
        db,
        module_id
    )

    return {
        "message": "Audit Module deleted successfully."
    }