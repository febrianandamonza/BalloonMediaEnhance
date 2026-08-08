from entities.role import Role

from repositories.base_repository import BaseRepository


class RoleRepository(
    BaseRepository[Role]
):

    def __init__(self):

        super().__init__(Role)

    def get_all(self, db):

        return (
            db.query(Role)
            .order_by(Role.name)
            .all()
        )