from datetime import datetime
from decimal import Decimal
from uuid import UUID
from datetime import datetime

from sqlalchemy import Boolean
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


class FlightSimulation(Base):

    __tablename__ = "flight_simulations"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True
    )

    simulation_name: Mapped[str | None] = mapped_column(
        String(150)
    )

    payload_weight: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    helium_volume: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    flight_altitude: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    estimated_duration: Mapped[int | None] = mapped_column(
        Integer
    )

    wind_speed: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    gust_speed: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    visibility: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    rainfall: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    temperature: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    go_no_go: Mapped[bool | None] = mapped_column(
        Boolean
    )

    remarks: Mapped[str | None] = mapped_column(
        Text
    )

    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id")
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime
    )

    creator = relationship(
        "User"
    )

    missions = relationship(
        "FlightMission",
        back_populates="simulation",
        cascade="all, delete-orphan"
    )