from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from database.database import get_db

from services.license_status_service import LicenseStatusService


from schemas.license_status_schema import LicenseStatusResponse

from dependencies.authorization import require_roles

router = APIRouter(
    prefix="/api/v1/license-status",
    tags=["License Status"],
    dependencies=[
        Depends(require_roles("Admin"))
    ]
)

service = LicenseStatusService()

@router.get(
    "",
    response_model=list[LicenseStatusResponse]
)
def get_license_status(
    db: Session = Depends(get_db)
):

    return service.get_all(db)