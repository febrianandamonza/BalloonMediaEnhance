from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from database.database import get_db

from schemas.user_schema import (
    UserResponse,
    UserStatusRequest,
    UserUpdateRequest
)

from services.user_service import UserService
from dependencies.authorization import require_roles

router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
    dependencies=[
        Depends(require_roles("Admin"))
    ]
)

service = UserService()

@router.get(
    "",
    response_model=list[UserResponse]
)
def get_all(

    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles("Admin")
    )

):

    return service.get_all(db)

@router.get(
    "/operators",
    response_model=list[UserResponse]
)
def get_all_operator(
    db: Session = Depends(get_db)
):

    return service.get_all_operator(
        db
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse
)
def get_by_id(
    user_id: UUID,
    db: Session = Depends(get_db),
):

    return service.get_by_id(
        db,
        user_id
    )


@router.put(
    "/{user_id}",
    response_model=UserResponse
)
def update(
    user_id: UUID,
    request: UserUpdateRequest,
    db: Session = Depends(get_db)
):


    return service.update(
        db,
        user_id,
        request
    )

    
# @router.delete(
#     "/{user_id}"
# )
# def delete(
#     user_id: UUID,
#     db: Session = Depends(get_db)
# ):

#     service.soft_delete(
#         db,
#         user_id
#     )
    
#     return {
#         "message": "User deactivated successfully."
#     }


@router.put(
    "/{user_id}/status",
    response_model=UserResponse
)
def change_status(

        user_id: UUID,

        request: UserStatusRequest,

        db: Session = Depends(get_db),

        current_user = Depends(
            require_roles("Admin")
        )
):
    return service.change_status(
        db,
        user_id,
        request
    )