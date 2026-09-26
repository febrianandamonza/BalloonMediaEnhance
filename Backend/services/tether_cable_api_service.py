from uuid import UUID

from services.base_service import BaseService
from repositories.tether_cable_api_repository import (
    TetherCableAPIRepository
)


class TetherCableAPIService(BaseService[TetherCableAPIRepository]):
    def __init__(self):
        super().__init__(
            TetherCableAPIRepository()
        )

    def get_all(self, db):
        return self.repository.get_all(db)

    def get_by_uid(self, db, uid: UUID):
        return self.repository.get_by_uid(db, uid)

    def start(self, db, udp_url: str):
        return self.repository.create_live(
            db,
            udp_url
        )

    def stop(self, db, uid: UUID):
        return self.repository.stop(
            db,
            uid
        )