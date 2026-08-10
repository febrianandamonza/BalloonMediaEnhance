from pydantic import BaseModel
from pydantic import ConfigDict


class AuditModuleCreateRequest(BaseModel):

    name: str

    description: str | None = None


class AuditModuleUpdateRequest(BaseModel):

    name: str

    description: str | None = None


class AuditModuleResponse(BaseModel):

    id: int

    name: str

    description: str | None

    model_config = ConfigDict(
        from_attributes=True
    )