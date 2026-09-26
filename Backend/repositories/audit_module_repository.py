from sqlalchemy.orm import Session

from entities.audit_module import AuditModule

from repositories.base_repository import BaseRepository


class AuditModuleRepository(
    BaseRepository[AuditModule]
):

    def __init__(self):

        super().__init__(
            AuditModule
        )

    def get_by_name(
        self,
        db: Session,
        name: str
    ):

        return (
            db.query(AuditModule)
            .filter(
                AuditModule.name == name
            )
            .first()
        )