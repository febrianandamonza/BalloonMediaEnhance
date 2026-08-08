from datetime import datetime
from uuid import uuid4

from entities.user import User

from repositories.user_repository import UserRepository
from utils.exceptions import (
    ConflictException,
    ForbiddenException,
    UnauthorizedException
)

from utils.security import (
    create_access_token,
    verify_password,
    hash_password,
    get_token_expire_seconds
)


class AuthService:

    def __init__(self):

        self.repository = UserRepository()

    def login(
        self,
        db,
        request
    ):

        user = self.repository.get_by_username(
            db,
            request.username
        )

        if not user:

            raise UnauthorizedException(
                "Invalid username or password."
            )

        if not user.is_active:

            raise ForbiddenException(
                "User is inactive."
            )

        if not verify_password(
            request.password,
            user.password_hash
        ):

            raise UnauthorizedException(
                "Invalid username or password."
            )

        token = create_access_token({

            "sub": str(user.id),

            "username": user.username,

            "role_id": user.role_id

        })

        user.last_login = datetime.utcnow()

        self.repository.update(
            db,
            user
        )

        return {

            "access_token": token,

            "token_type": "Bearer",

            "expires_in": get_token_expire_seconds(),

            "user_id": user.id,

            "username": user.username,

            "full_name": user.full_name,

            "role_id": user.role_id

        }

    def register(
        self,
        db,
        request
    ):

        user = self.repository.get_by_username(
            db,
            request.username
        )

        if user:

            raise ConflictException(
                "Username already exists."
            )

        password_hash = hash_password(request.password)

        entity = User(

            id=uuid4(),

            role_id=request.role_id,

            username=request.username,

            password_hash=password_hash,

            full_name=request.full_name,

            email=request.email,

            phone=request.phone,

            is_active=True,

            created_at=datetime.utcnow()

        )

        return self.repository.create(
            db,
            entity
        )