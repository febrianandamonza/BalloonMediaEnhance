from fastapi import Depends
from fastapi import HTTPException

from entities.user import User

from dependencies.authentication import get_current_user


def require_roles(
    *roles: str
):

    print("require_roles dibuat")

    def checker(
            

        current_user: User = Depends(
            get_current_user
        )

    ):
        print("checker dipanggil")
        print(current_user)

        if current_user.role.name not in roles:

            raise HTTPException(

                status_code=403,

                detail="You don't have permission."

            )

        return current_user

    return checker