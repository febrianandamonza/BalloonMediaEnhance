from uuid import UUID

from services.base_service import BaseService

from repositories.tether_cable_monitor_repository import (
    TetherCableMonitorRepository
)


class TetherCableMonitorService(
    BaseService[TetherCableMonitorRepository]
):

    def __init__(self):

        super().__init__(
            TetherCableMonitorRepository()
        )

    def get_all(
        self,
        db
    ):

        return self.repository.get_all(
            db
        )

    def get_by_id(
        self,
        db,
        monitor_id: UUID
    ):

        return self.repository.get_by_id(
            db,
            monitor_id
        )

    def create(
        self,
        db,
        data,
        image_path
    ):

        return self.repository.create_monitor(
            db,
            data,
            image_path
        )