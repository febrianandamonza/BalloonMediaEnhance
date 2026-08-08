from uuid import UUID
from decimal import Decimal
from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict


class FlightSimulationCreateRequest(BaseModel):

    simulation_name: str

    payload_weight: Decimal | None = None

    helium_volume: Decimal | None = None

    flight_altitude: Decimal | None = None

    estimated_duration: int | None = None

    wind_speed: Decimal | None = None

    gust_speed: Decimal | None = None

    visibility: Decimal | None = None

    rainfall: Decimal | None = None

    temperature: Decimal | None = None

    go_no_go: bool | None = None

    remarks: str | None = None


class FlightSimulationUpdateRequest(
    FlightSimulationCreateRequest
):
    pass

class FlightSimulationResponse(BaseModel):

    id: UUID

    simulation_name: str | None

    payload_weight: Decimal | None

    helium_volume: Decimal | None

    flight_altitude: Decimal | None

    estimated_duration: int | None

    wind_speed: Decimal | None

    gust_speed: Decimal | None

    visibility: Decimal | None

    rainfall: Decimal | None

    temperature: Decimal |None

    go_no_go: bool | None

    remarks: str | None

    created_by: UUID | None

    created_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True
    )