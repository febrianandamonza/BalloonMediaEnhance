from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict


class TetherCableMonitorCreate(BaseModel):

    operating_voltage: float | None = None

    load_current: float | None = None

    insulation_resistance: float | None = None

    conductor_continuity: str | None = None

    optical_snr: float | None = None

    optical_attenuation: float | None = None

    sheath_temperature: float | None = None

    kevlar_tension: float | None = None

    description: str | None = None


class TetherCableMonitorResponse(BaseModel):

    id: UUID

    operating_voltage: float | None

    load_current: float | None

    insulation_resistance: float | None

    conductor_continuity: str | None

    optical_snr: float | None

    optical_attenuation: float | None

    sheath_temperature: float | None

    kevlar_tension: float | None

    folder_path: str | None

    description: str | None

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )