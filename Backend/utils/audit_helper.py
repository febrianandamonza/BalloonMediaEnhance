from fastapi import Request

from services.audit_log_service import AuditLogService


class AuditHelper:

    def __init__(self):

        self.service = AuditLogService()

    def log(
        self,
        db,
        request: Request,
        current_user,
        module: str,
        action: str,
        entity: str,
        entity_id,
        description: str,
        status: str = "SUCCESS"
    ):

        self.service.create(

            db=db,

            user_id=(
                current_user.id
                if current_user
                else None
            ),

            module_name=module,

            action=action,

            entity=entity,

            entity_id=entity_id,

            description=description,

            ip_address=request.client.host,

            user_agent=request.headers.get(
                "User-Agent"
            ),

            status=status

        )


audit = AuditHelper()