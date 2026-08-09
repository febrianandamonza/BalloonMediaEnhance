from pydantic import BaseModel
from pydantic import ConfigDict


class RoleResponse(BaseModel):

    id: int

    name: str

    description: str | None

    model_config = ConfigDict(
        from_attributes=True
    )


class RoleSimpleResponse(BaseModel):

    id: int

    name: str

    model_config = ConfigDict(
        from_attributes=True
    )