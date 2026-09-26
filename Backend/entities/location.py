from decimal import Decimal

from sqlalchemy import BigInteger
from sqlalchemy import Numeric
from sqlalchemy import String

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from database.database import Base


class Location(Base):

    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    name: Mapped[str | None] = mapped_column(
        String(150)
    )

    city: Mapped[str | None] = mapped_column(
        String(100)
    )

    province: Mapped[str | None] = mapped_column(
        String(100)
    )

    latitude: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    longitude: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    missions = relationship(
        "FlightMission",
        back_populates="location"
    )