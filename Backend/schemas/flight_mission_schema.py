from uuid import UUID
from decimal import Decimal
from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict

from schemas.mission_status_schema import MissionStatusSimpleRespone
from schemas.location_schema import LocationSimpleResponse
from schemas.balloon_schema import BalloonSimpleResponse


class FlightMissionCreateRequest(BaseModel):

    simulation_id: UUID

    mission_name: str | None = None

    mission_code: str | None = None

    description: str | None = None

    location_id: int | None = None

    balloon_id: UUID | None = None

    status_id: int | None = None


class FlightMissionUpdateRequest(
    FlightMissionCreateRequest
):
    pass


class FlightMissionResponse(BaseModel):

    id: UUID

    simulation_id: UUID

    mission_code: str

    mission_name: str | None

    description: str | None

    location: LocationSimpleResponse

    balloon: BalloonSimpleResponse

    mission_status: MissionStatusSimpleRespone

    created_by: UUID | None

    created_at: datetime | None

    updated_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True
    )