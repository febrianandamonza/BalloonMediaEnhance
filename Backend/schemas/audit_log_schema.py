from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict

from schemas.audit_module_schema import AuditModuleResponse
from schemas.user_schema import UserSimpleResponse


class AuditLogResponse(BaseModel):

    id: int

    user_id: UUID | None

    module_id: int | None

    action: str | None

    entity: str | None

    entity_id: UUID | None

    description: str | None

    ip_address: str | None

    user_agent: str | None

    status: str | None

    created_at: datetime | None

    user: UserSimpleResponse | None

    module: AuditModuleResponse | None

    model_config = ConfigDict(
        from_attributes=True
    )