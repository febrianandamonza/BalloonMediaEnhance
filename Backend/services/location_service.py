from entities.location import Location

from repositories.location_repository import LocationRepository

from services.base_service import BaseService

from utils.exceptions import (
    ConflictException,
    NotFoundException
)


class LocationService(
    BaseService[LocationRepository]
):

    def __init__(self):

        super().__init__(
            LocationRepository()
        )

    def get_by_id(
        self,
        db,
        location_id
    ):

        entity = super().get_by_id(
            db,
            location_id
        )

        if entity is None:

            raise NotFoundException(
                "Location not found."
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
                "Location already exists."
            )

        entity = Location(

            name=request.name,

            city=request.city,

            province=request.province,

            latitude=request.latitude,

            longitude=request.longitude

        )

        return super().create(
            db,
            entity
        )

    def update(
        self,
        db,
        location_id,
        request
    ):

        entity = self.get_by_id(
            db,
            location_id
        )

        entity.name = request.name

        entity.city = request.city

        entity.province = request.province

        entity.latitude = request.latitude

        entity.longitude = request.longitude

        return super().update(
            db,
            entity
        )

    def delete(
        self,
        db,
        location_id
    ):

        entity = self.get_by_id(
            db,
            location_id
        )

        return super().delete(
            db,
            entity
        )