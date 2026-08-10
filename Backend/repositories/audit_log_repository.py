from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from entities.audit_log import AuditLog

from repositories.base_repository import BaseRepository


class AuditLogRepository(
    BaseRepository[AuditLog]
):

    def __init__(self):

        super().__init__(AuditLog)

    def get_all(
        self,
        db: Session
    ):

        return (
            db.query(AuditLog)
            .options(
                joinedload(AuditLog.user),
                joinedload(AuditLog.module)
            )
            .order_by(
                AuditLog.created_at.desc()
            )
            .all()
        )

    def get_by_id(
        self,
        db: Session,
        audit_id
    ):

        return (
            db.query(AuditLog)
            .options(
                joinedload(AuditLog.user),
                joinedload(AuditLog.module)
            )
            .filter(
                AuditLog.id == audit_id
            )
            .first()
        )