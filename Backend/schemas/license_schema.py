from uuid import UUID
from datetime import date

from pydantic import BaseModel
from pydantic import ConfigDict


class LicenseCreateRequest(BaseModel):

    license_code: str

    license_name: str

    description: str | None = None

    issued_date: date | None = None

    expired_date: date | None = None


class LicenseUpdateRequest(BaseModel):

    license_code: str

    license_name: str

    description: str | None = None

    issued_date: date | None = None

    expired_date: date | None = None
    


class LicenseResponse(BaseModel):

    id: UUID

    license_code: str

    license_name: str

    description: str | None

    issued_date: date | None

    expired_date: date | None

    model_config = ConfigDict(
        from_attributes=True
    )