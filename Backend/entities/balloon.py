from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import DateTime
from sqlalchemy import Numeric
from sqlalchemy import String

from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship


from database.database import Base


class Balloon(Base):

    __tablename__ = "balloons"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True
    )

    serial_number: Mapped[str | None] = mapped_column(
        String(100)
    )

    balloon_name: Mapped[str | None] = mapped_column(
        String(150)
    )

    capacity: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    max_altitude: Mapped[Decimal | None] = mapped_column(
        Numeric
    )

    status: Mapped[str | None] = mapped_column(
        String(50)
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime
    )

    missions = relationship(
        "FlightMission",
        back_populates="balloon"
    )