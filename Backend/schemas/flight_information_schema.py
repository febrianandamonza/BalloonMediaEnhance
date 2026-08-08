from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict


class FlightInformationCreateRequest(BaseModel):

    mission_id: UUID

    mission_leader: str

    takeoff_time: datetime | None = None

    landing_time: datetime | None = None

    duration: int | None = None

    max_altitude: Decimal | None = None

    cable_length: Decimal | None = None

    weather: str | None = None

    remarks: str | None = None


class FlightInformationUpdateRequest(
    FlightInformationCreateRequest
):
    pass


class FlightInformationResponse(BaseModel):

    id: UUID

    mission_id: UUID

    mission_leader: str | None

    takeoff_time: datetime | None

    landing_time: datetime | None

    duration: int | None

    max_altitude: Decimal | None

    cable_length: Decimal | None

    weather: str | None

    remarks: str | None

    created_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True
    )