from uuid import uuid4
from datetime import datetime

from entities.user import User

from repositories.user_repository import UserRepository

from services.base_service import BaseService

from utils.exceptions import NotFoundException


class UserService(BaseService[UserRepository]):

    def __init__(self):

        super().__init__(UserRepository())


    def update(
        self,
        db,
        user_id,
        request
    ):

        user = self.repository.get_by_id(
            db,
            user_id
        )

        if not user:
            raise NotFoundException("User not found.")

        user.role_id = request.role_id
        user.full_name = request.full_name
        user.email = request.email
        user.phone = request.phone

        return self.repository.update(
            db,
            user
        )

    def get_by_id(
        self,
        db,
        user_id
    ):

        return self.repository.get_by_id(
            db,
            user_id
        )

    def soft_delete(
        self,
        db,
        user_id
    ):

        user = self.repository.get_by_id(
            db,
            user_id
        )

        if not user:

            raise NotFoundException(
                "User not found."
            )

        user.is_active = False

        return self.repository.update(
            db,
            user
        )