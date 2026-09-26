from datetime import datetime
from uuid import uuid4

from entities.balloon import Balloon

from repositories.balloon_repository import BalloonRepository

from services.base_service import BaseService

from utils.exceptions import (
    ConflictException,
    NotFoundException
)


class BalloonService(
    BaseService[BalloonRepository]
):

    def __init__(self):

        super().__init__(
            BalloonRepository()
        )

    def get_by_id(
        self,
        db,
        balloon_id
    ):

        entity = super().get_by_id(
            db,
            balloon_id
        )

        if entity is None:

            raise NotFoundException(
                "Balloon not found."
            )

        return entity

    def create(
        self,
        db,
        request
    ):

        if self.repository.get_by_serial_number(
            db,
            request.serial_number
        ):

            raise ConflictException(
                "Serial number already exists."
            )

        entity = Balloon(

            id=uuid4(),

            serial_number=request.serial_number,

            balloon_name=request.balloon_name,

            capacity=request.capacity,

            max_altitude=request.max_altitude,

            status=request.status,

            created_at=datetime.utcnow()

        )

        return super().create(
            db,
            entity
        )

    def update(
        self,
        db,
        balloon_id,
        request
    ):

        entity = self.get_by_id(
            db,
            balloon_id
        )

        entity.serial_number = request.serial_number

        entity.balloon_name = request.balloon_name

        entity.capacity = request.capacity

        entity.max_altitude = request.max_altitude

        entity.status = request.status

        return super().update(
            db,
            entity
        )

    def delete(
        self,
        db,
        balloon_id
    ):

        entity = self.get_by_id(
            db,
            balloon_id
        )

        return super().delete(
            db,
            entity
        )