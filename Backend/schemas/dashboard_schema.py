from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict


class DashboardMediaResponse(BaseModel):

    id: UUID

    media_type: str

    processing_type: str

    original_filename: str

    stored_filename: str

    storage_path: str

    mime_type: str

    file_size: int

    uploaded_by: UUID

    uploaded_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class DashboardFlightInformationResponse(BaseModel):

    id: UUID

    mission_leader: str | None

    takeoff_time: datetime | None

    landing_time: datetime | None

    duration: int | None

    max_altitude: Decimal | None

    cable_length: Decimal | None

    weather: str | None

    remarks: str | None

    created_at: datetime | None

    media: list[DashboardMediaResponse] = []

    model_config = ConfigDict(
        from_attributes=True
    )


class DashboardMissionStatusResponse(BaseModel):

    id: int

    name: str | None

    description: str | None

    model_config = ConfigDict(
        from_attributes=True
    )


class DashboardLocationResponse(BaseModel):

    id: int

    name: str | None

    city: str | None

    province: str | None

    latitude: Decimal | None

    longitude: Decimal | None

    model_config = ConfigDict(
        from_attributes=True
    )


class DashboardBalloonResponse(BaseModel):

    id: UUID

    serial_number: str | None

    balloon_name: str | None

    capacity: Decimal | None

    max_altitude: Decimal | None

    status: str | None

    created_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True
    )


class DashboardMissionResponse(BaseModel):

    id: UUID

    mission_code: str

    mission_name: str | None

    description: str | None

    mission_status: DashboardMissionStatusResponse | None

    location: DashboardLocationResponse | None

    balloon: DashboardBalloonResponse | None

    flight_information: (
        DashboardFlightInformationResponse | None
    )

    created_by: UUID | None

    created_at: datetime | None

    updated_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True
    )


class DashboardSimulationResponse(BaseModel):

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

    temperature: Decimal | None

    go_no_go: bool | None

    remarks: str | None

    created_by: UUID | None

    created_at: datetime | None

    missions: list[DashboardMissionResponse] = []

    model_config = ConfigDict(
        from_attributes=True
    )