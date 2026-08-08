from datetime import date
from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict



class UserLicenseUpdateRequest(BaseModel):

    status_id: int

    license_number: str

    issued_by: str | None = None

    issued_date: date | None = None

    expired_date: date | None = None

    document_path: str | None = None

    remarks: str | None = None


class UserLicenseCreateRequest(BaseModel):

    user_id: UUID

    license_id: UUID

    status_id: int

    license_number: str

    issued_by: str | None = None

    issued_date: date | None = None

    expired_date: date | None = None

    document_path: str | None = None

    remarks: str | None = None


class UserLicenseUpdateRequest(BaseModel):

    status_id: int

    license_number: str

    issued_by: str | None = None

    issued_date: date | None = None

    expired_date: date | None = None

    document_path: str | None = None

    remarks: str | None = None


class UserLicenseResponse(BaseModel):

    id: UUID

    user_id: UUID

    license_id: UUID

    status_id: int

    license_number: str

    issued_by: str | None

    issued_date: date | None

    expired_date: date | None

    document_path: str | None

    remarks: str | None

    model_config = ConfigDict(
        from_attributes=True
    )