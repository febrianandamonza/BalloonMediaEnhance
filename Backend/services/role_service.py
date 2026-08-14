from services.base_service import BaseService

from repositories.role_repository import RoleRepository


class RoleService(
    BaseService[RoleRepository]
):

    def __init__(self):

        super().__init__(
            RoleRepository()
        )

    