from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import BigInteger

from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from database.database import Base


class FlightMission(Base):

    __tablename__ = "flight_missions"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True
    )

    simulation_id: Mapped[UUID] = mapped_column(
        ForeignKey("flight_simulations.id"),
        nullable=False
    )

    mission_code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    mission_name: Mapped[str | None] = mapped_column(
        String(150)
    )

    description: Mapped[str | None] = mapped_column(
        Text
    )

    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id")
    )

    balloon_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("balloons.id")
    )

    status_id: Mapped[int | None] = mapped_column(
        ForeignKey("mission_status.id")
    )

    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id")
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime
    )

    simulation = relationship(
        "FlightSimulation",
        back_populates="missions"
    )

    creator = relationship(
        "User"
    )

    mission_status = relationship(
        "MissionStatus",
        back_populates="missions"
    )

    location= relationship(
        "Location",
        back_populates="missions"
    )

    balloon= relationship(
        "Balloon",
        back_populates="missions"
    )

    flight_information = relationship(
        "FlightInformation",
        back_populates="mission",
        uselist=False,
        cascade="all, delete-orphan"
    )

