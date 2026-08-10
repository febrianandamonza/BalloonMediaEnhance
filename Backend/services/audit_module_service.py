from repositories.audit_module_repository import AuditModuleRepository

from services.base_service import BaseService

from entities.audit_module import AuditModule

from utils.exceptions import (
    ConflictException,
    NotFoundException
)


class AuditModuleService(
    BaseService[AuditModuleRepository]
):

    def __init__(self):

        super().__init__(
            AuditModuleRepository()
        )

    def get_by_id(
        self,
        db,
        module_id
    ):

        entity = super().get_by_id(
            db,
            module_id
        )

        if entity is None:

            raise NotFoundException(
                "Audit Module not found."
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
                "Audit Module already exists."
            )

        entity = AuditModule(

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
        module_id,
        request
    ):

        entity = self.get_by_id(
            db,
            module_id
        )

        duplicated = self.repository.get_by_name(
            db,
            request.name
        )

        if (
            duplicated
            and duplicated.id != module_id
        ):

            raise ConflictException(
                "Audit Module already exists."
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
        module_id
    ):

        entity = self.get_by_id(
            db,
            module_id
        )

        return super().delete(
            db,
            entity
        )