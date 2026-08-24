from datetime import datetime
from uuid import UUID

from sqlalchemy import BigInteger
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String

from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from database.database import Base


class Media(Base):

    __tablename__ = "media"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True
    )

    flight_information_id: Mapped[UUID] = mapped_column(
        ForeignKey("flight_information.id")
    )

    media_type: Mapped[str] = mapped_column(
        String(20)
    )

    processing_type: Mapped[str] = mapped_column(
        String(50)
    )

    original_filename: Mapped[str] = mapped_column(
        String(255)
    )

    stored_filename: Mapped[str] = mapped_column(
        String(255)
    )

    storage_path: Mapped[str] = mapped_column(
        String(500)
    )

    mime_type: Mapped[str] = mapped_column(
        String(100)
    )

    file_size: Mapped[int] = mapped_column(
        BigInteger
    )

    uploaded_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id")
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime
    )

    flight_information = relationship(
        "FlightInformation",
        back_populates="media"
    )

    uploader = relationship(
        "User"
    )