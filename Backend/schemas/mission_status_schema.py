from pydantic import BaseModel
from pydantic import ConfigDict


class MissionStatusSimpleRespone(BaseModel):
    name: str | None

    description: str | None

    model_config = ConfigDict(
        from_attributes=True
    )

class MissionStatusCreateRequest(BaseModel):

    name: str

    description: str | None = None


class MissionStatusUpdateRequest(BaseModel):

    name: str

    description: str | None = None


class MissionStatusResponse(BaseModel):

    id: int

    name: str | None

    description: str | None

    model_config = ConfigDict(
        from_attributes=True
    )