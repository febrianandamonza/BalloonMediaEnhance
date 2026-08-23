from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field


class NotificationResponse(BaseModel):

    id: int

    title: str

    description: str | None

    level: str

    type: str

    status: str

    isRead: bool

    source: str | None

    metadata: dict | None = Field(
        validation_alias="metadata_"
    )

    createdAt: datetime


    updatedAt: datetime

    model_config = ConfigDict(
        from_attributes=True
    )