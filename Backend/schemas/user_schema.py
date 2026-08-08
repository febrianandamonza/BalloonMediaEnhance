from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict



class UserResponse(BaseModel):

    id: UUID

    username: str

    full_name: str

    email: str | None

    phone: str | None

    is_active: bool

    model_config = ConfigDict(
        from_attributes=True
    )


class UserUpdateRequest(BaseModel):

    role_id: int

    full_name: str

    email: str | None = None

    phone: str | None = None
    