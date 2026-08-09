from uuid import UUID
from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict

from schemas.role_schema import RoleSimpleResponse

class UserResponse(BaseModel):

    id: UUID

    username: str

    full_name: str

    email: str | None

    phone: str | None

    is_active: bool

    created_at: datetime | None

    updated_at: datetime | None

    last_login: datetime | None

    role: RoleSimpleResponse

    model_config = ConfigDict(
        from_attributes=True
    )


class UserUpdateRequest(BaseModel):

    role_id: int

    full_name: str

    email: str | None = None

    phone: str | None = None
    