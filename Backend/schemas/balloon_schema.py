from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict


class BalloonCreateRequest(BaseModel):

    serial_number: str

    balloon_name: str

    capacity: Decimal

    max_altitude: Decimal

    status: str


class BalloonUpdateRequest(BaseModel):

    serial_number: str

    balloon_name: str

    capacity: Decimal

    max_altitude: Decimal

    status: str


class BalloonResponse(BaseModel):

    id: UUID

    serial_number: str

    balloon_name: str

    capacity: Decimal

    max_altitude: Decimal

    status: str

    created_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True
    )