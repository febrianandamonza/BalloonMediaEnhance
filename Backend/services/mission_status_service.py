from entities.mission_status import MissionStatus

from repositories.mission_status_repository import MissionStatusRepository

from services.base_service import BaseService

from utils.exceptions import (
    ConflictException,
    NotFoundException
)


class MissionStatusService(
    BaseService[MissionStatusRepository]
):

    def __init__(self):

        super().__init__(
            MissionStatusRepository()
        )

    def get_by_id(
        self,
        db,
        status_id
    ):

        entity = super().get_by_id(
            db,
            status_id
        )

        if entity is None:

            raise NotFoundException(
                "Mission Status not found."
            )

        return entity

    def create(
        self,
        db,
        request
    ):

        if self.repository.get_by_name(
            db,
            request.name
        ):

            raise ConflictException(
                "Mission Status already exists."
            )

        entity = MissionStatus(

            name=request.name,

            description=request.description

        )

        return super().create(
            db,
            entity
        )

    def update(
        self,
        db,
        status_id,
        request
    ):

        entity = self.get_by_id(
            db,
            status_id
        )

        entity.name = request.name

        entity.description = request.description

        return super().update(
            db,
            entity
        )

    def delete(
        self,
        db,
        status_id
    ):

        entity = self.get_by_id(
            db,
            status_id
        )

        return super().delete(
            db,
            entity
        )