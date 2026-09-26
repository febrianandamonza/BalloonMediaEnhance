from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from database.database import get_db

from dependencies.authorization import require_roles

from services.audit_log_service import AuditLogService

from schemas.audit_log_schema import AuditLogResponse

router = APIRouter(

    prefix="/api/v1/audit-logs",

    tags=["Audit Logs"]

)

service = AuditLogService()


@router.get(

    "",

    response_model=list[AuditLogResponse],

    dependencies=[

        Depends(require_roles("Admin"))

    ]

)
def get_all(

    db: Session = Depends(get_db)

):

    return service.get_all(db)


@router.get(

    "/{audit_id}",

    response_model=AuditLogResponse,

    dependencies=[

        Depends(require_roles("Admin"))

    ]

)
def get_by_id(

    audit_id: int,

    db: Session = Depends(get_db)

):

    return service.get_by_id(
        db,
        audit_id
    )