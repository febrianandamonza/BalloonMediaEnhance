from datetime import datetime
from uuid import uuid4

from entities.license import License

from repositories.license_repository import LicenseRepository

from services.base_service import BaseService


class LicenseService(
    BaseService[LicenseRepository]
):

    def __init__(self):

        super().__init__(
            LicenseRepository()
        )

    def create(
        self,
        db,
        request
    ):

        if self.repository.get_by_code(
            db,
            request.license_code
        ):

            raise ValueError(
                "License code already exists."
            )

        entity = License(

            id=uuid4(),

            license_code=request.license_code,

            license_name=request.license_name,

            description=request.description,

            created_at=datetime.utcnow()

        )

        return self.repository.create(
            db,
            entity
        )

    def get_by_id(
        self,
        db,
        license_id
    ):

        return self.repository.get_by_id(
            db,
            license_id
        )

    def update(
        self,
        db,
        license_id,
        request
    ):

        entity = self.repository.get_by_id(
            db,
            license_id
        )

        if not entity:

            raise ValueError(
                "License not found."
            )

        entity.license_code = request.license_code
        entity.license_name = request.license_name
        entity.description = request.description
        entity.updated_at = datetime.utcnow()

        return self.repository.update(
            db,
            entity
        )

    def soft_delete(
        self,
        db,
        license_id
    ):

        entity = self.repository.get_by_id(
            db,
            license_id
        )

        if not entity:

            raise ValueError(
                "License not found."
            )

        db.delete(entity)
        db.commit()