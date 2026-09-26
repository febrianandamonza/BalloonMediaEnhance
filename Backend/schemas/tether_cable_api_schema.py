from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TetherCableAPICreate(BaseModel):
    udp_url: str


class TetherCableAPIResponse(BaseModel):
    uid: UUID
    status: str
    udp_url: str
    created_at: datetime
    stopped_at: datetime | None

    model_config = ConfigDict(from_attributes=True)