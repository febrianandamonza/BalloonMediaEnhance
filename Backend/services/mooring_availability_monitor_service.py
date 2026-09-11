from uuid import UUID

from services.base_service import BaseService

from repositories.mooring_availability_monitor_repository import (
    MooringAvailabilityMonitorRepository
)


class MooringAvailabilityMonitorService(
    BaseService[MooringAvailabilityMonitorRepository]
):

    def __init__(self):

        super().__init__(
            MooringAvailabilityMonitorRepository()
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
        data
    ):

        return self.repository.create_monitor(
            db,
            data
        )