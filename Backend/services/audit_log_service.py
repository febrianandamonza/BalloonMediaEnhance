from datetime import datetime

from entities.audit_log import AuditLog

from repositories.audit_log_repository import AuditLogRepository
from repositories.audit_module_repository import AuditModuleRepository

from services.base_service import BaseService

from utils.exceptions import NotFoundException


class AuditLogService(
    BaseService[AuditLogRepository]
):

    def __init__(self):

        super().__init__(
            AuditLogRepository()
        )

        self.module_repository = AuditModuleRepository()

    def get_by_id(
        self,
        db,
        audit_id
    ):

        entity = super().get_by_id(
            db,
            audit_id
        )

        if entity is None:

            raise NotFoundException(
                "Audit Log not found."
            )

        return entity

    def create(
        self,
        db,
        *,
        user_id,
        module_name,
        action,
        entity,
        entity_id,
        description,
        ip_address,
        user_agent,
        status
    ):

        module = self.module_repository.get_by_name(
            db,
            module_name
        )

        if module is None:

            raise NotFoundException(
                "Audit Module not found."
            )

        log = AuditLog(

            user_id=user_id,

            module_id=module.id,

            action=action,

            entity=entity,

            entity_id=entity_id,

            description=description,

            ip_address=ip_address,

            user_agent=user_agent,

            status=status,

            created_at=datetime.utcnow()

        )

        return super().create(
            db,
            log
        )