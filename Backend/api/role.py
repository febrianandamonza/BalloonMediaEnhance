from dependencies.authorization import require_roles
from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from database.database import get_db

from services.role_service import RoleService

from schemas.role_schema import RoleResponse
from dependencies.authorization import require_roles

router = APIRouter(
    prefix="/api/v1/roles",
    tags=["Roles"],
    dependencies=[
        Depends(require_roles("Admin"))
    ]
)

service = RoleService()


@router.get(
    "",
    response_model=list[RoleResponse]
)
def get_roles(
    db: Session = Depends(get_db)
):

    return service.get_all(db)