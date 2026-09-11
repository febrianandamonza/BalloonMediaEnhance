from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict


class MooringAvailabilityMonitorCreate(BaseModel):

    wind_speed: float | None = None

    winch_tension: float | None = None

    helium_pressure: float | None = None

    ambient_temperature: float | None = None

    backup_battery_voltage: float | None = None

    backup_battery_percentage: float | None = None

    emergency_inverter_status: str | None = None

    lightning_protection_status: str | None = None

    optical_link_eop: float | None = None

    folder_path: str | None = None

    description: str | None = None


class MooringAvailabilityMonitorResponse(BaseModel):

    id: UUID

    wind_speed: float | None

    winch_tension: float | None

    helium_pressure: float | None

    ambient_temperature: float | None

    backup_battery_voltage: float | None

    backup_battery_percentage: float | None

    emergency_inverter_status: str | None

    lightning_protection_status: str | None

    optical_link_eop: float | None

    folder_path: str | None

    description: str | None

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )