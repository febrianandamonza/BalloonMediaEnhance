from fastapi import Depends
from fastapi import HTTPException

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from sqlalchemy.orm import Session

from database.database import get_db

from repositories.user_repository import UserRepository

from utils.security import decode_access_token

security = HTTPBearer(auto_error=False)

repository = UserRepository()


def get_current_user(

    credentials: HTTPAuthorizationCredentials = Depends(
        security
    ),

    db: Session = Depends(
        get_db
    )

):
    # print("CREDENTIALS:", credentials)

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing."
        )

    # print("SCHEME:", credentials.scheme)
    # print("TOKEN:", credentials.credentials)

    token = credentials.credentials

    # print("TOKEN :", token)

    payload = decode_access_token(
        token
    )
    # print("PAYLOAD :", payload)

    if payload is None:

        raise HTTPException(

            status_code=401,

            detail="Invalid token."

        )

    user = repository.get_by_id(

        db,

        payload["sub"]

    )

    if user is None:

        raise HTTPException(

            status_code=401,

            detail="User not found."

        )

    if not user.is_active:

        raise HTTPException(

            status_code=403,

            detail="User is inactive."

        )

    return user