from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from database.database import Base


class FlightInformation(Base):

    __tablename__ = "flight_information"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True
    )

    mission_id: Mapped[UUID] = mapped_column(
        ForeignKey("flight_missions.id"),
        unique=True
    )

    mission_leader: Mapped[str | None] = mapped_column(
        String(150)
    )

    takeoff_time: Mapped[datetime | None] = mapped_column(
        DateTime
    )

    landing_time: Mapped[datetime | None] = mapped_column(
        DateTime
    )

    duration: Mapped[int | None] = mapped_column(
        Integer
    )

    max_altitude: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    cable_length: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    weather: Mapped[str | None] = mapped_column(
        String(100)
    )

    remarks: Mapped[str | None] = mapped_column(
        Text
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime
    )

    mission = relationship(
        "FlightMission",
        back_populates="flight_information"
    )

    media = relationship(
        "Media",
        back_populates="flight_information",
        cascade="all, delete-orphan"
    )