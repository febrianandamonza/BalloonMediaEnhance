from uuid import UUID

from pydantic import BaseModel
from pydantic import EmailStr
from pydantic import ConfigDict



class CurrentUserResponse(BaseModel):

    id: UUID

    username: str

    full_name: str

    email: str | None

    phone: str | None

    role_id: int

    model_config = ConfigDict(
        from_attributes=True
    )


class RegisterRequest(BaseModel):

    role_id: int

    username: str

    password: str

    full_name: str

    email: EmailStr | None = None

    phone: str | None = None


class LoginRequest(BaseModel):

    username: str

    password: str


class LoginResponse(BaseModel):

    access_token: str

    token_type: str

    expires_in: int

    user_id: UUID

    username: str

    full_name: str

    role_id: int