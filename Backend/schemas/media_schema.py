from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict

from schemas.user_schema import UserSimpleResponse


class MediaSaveRequest(BaseModel):

    flight_information_id: UUID

    temp_path: str

    processing_type: str


class MediaResponse(BaseModel):

    id: UUID

    flight_information_id: UUID

    media_type: str

    processing_type: str

    original_filename: str

    stored_filename: str

    storage_path: str

    mime_type: str

    file_size: int

    uploaded_at: datetime

    uploader: UserSimpleResponse

    model_config = ConfigDict(
        from_attributes=True
    )