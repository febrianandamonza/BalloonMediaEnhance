from datetime import datetime
from uuid import uuid4

from repositories.user_repository import UserRepository
from repositories.license_repository import LicenseRepository
from repositories.license_status_repository import LicenseStatusRepository
from repositories.user_license_repository import UserLicenseRepository

from entities.user_license import UserLicense

from utils.exceptions import NotFoundException, ConflictException, BadRequestException


class UserLicenseService:

    def __init__(self):

        self.user_repository = UserRepository()

        self.license_repository = LicenseRepository()

        self.status_repository = LicenseStatusRepository()

        self.repository = UserLicenseRepository()


    def delete(
        self,
        db,
        user_license_id
    ):

        entity = self.repository.get_by_id(
            db,
            user_license_id
        )

        if entity is None:

            raise NotFoundException(
                "User License not found."
            )

        self.repository.delete(
            db,
            entity
        )


    def update(
        self,
        db,
        user_license_id,
        request
    ):

        entity = self.repository.get_by_id(
            db,
            user_license_id
        )

        if entity is None:

            raise NotFoundException(
                "User License not found."
            )

        if not self.status_repository.get_by_id(
            db,
            request.status_id
        ):

            raise NotFoundException(
                "License status not found."
            )

        if (
            request.issued_date
            and request.expired_date
            and request.expired_date < request.issued_date
        ):

            raise BadRequestException(
                "Expired date must be greater than issued date."
            )

        entity.status_id = request.status_id

        entity.license_number = request.license_number

        entity.issued_by = request.issued_by

        entity.issued_date = request.issued_date

        entity.expired_date = request.expired_date

        entity.document_path = request.document_path

        entity.remarks = request.remarks

        entity.updated_at = datetime.utcnow()

        return self.repository.update(
            db,
            entity
        )

    def get_all(
        self,
        db
    ):

        entity = self.repository.get_all(db)

        if not entity:
            raise NotFoundException(
                "User Licenses not found."
            )

        return entity

    def get_by_id(
        self,
        db,
        user_license_id
    ):

        entity = self.repository.get_by_id(
            db,
            user_license_id
        )

        if entity is None:
            raise NotFoundException(
                "User License not found."
            )

        return entity

    def get_by_user(
        self,
        db,
        user_id
    ):

        entity = self.repository.get_by_user(
            db,
            user_id
        )

        if not entity:
            raise NotFoundException(
                "User License not found."
            )

        return entity

    def create(
        self,
        db,
        request
    ):

        if not self.user_repository.get_by_id(
            db,
            request.user_id
        ):

            raise NotFoundException(
                "User not found."
            )

        if not self.license_repository.get_by_id(
            db,
            request.license_id
        ):

            raise NotFoundException(
                "License not found."
            )

        if not self.status_repository.get_by_id(
            db,
            request.status_id
        ):

            raise NotFoundException(
                "License status not found."
            )

        if self.repository.exists(
            db,
            request.user_id,
            request.license_id
        ):

            raise ConflictException(
                "User already has this license."
            )

        if (
            request.issued_date
            and request.expired_date
            and request.expired_date < request.issued_date
        ):

            raise BadRequestException(
                "Expired date must be greater than issued date."
            )

        entity = UserLicense(

            id=uuid4(),

            user_id=request.user_id,

            license_id=request.license_id,

            status_id=request.status_id,

            license_number=request.license_number,

            issued_by=request.issued_by,

            issued_date=request.issued_date,

            expired_date=request.expired_date,

            document_path=request.document_path,

            remarks=request.remarks,

            created_at=datetime.utcnow()

        )

        return self.repository.create(
            db,
            entity
        )