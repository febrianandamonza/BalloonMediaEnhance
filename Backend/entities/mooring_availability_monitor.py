from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from database.database import Base


class MooringAvailabilityMonitor(Base):

    __tablename__ = "mooring_availability_monitors"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True
    )

    wind_speed: Mapped[float | None] = mapped_column(
        Numeric
    )

    winch_tension: Mapped[float | None] = mapped_column(
        Numeric
    )

    helium_pressure: Mapped[float | None] = mapped_column(
        Numeric
    )

    ambient_temperature: Mapped[float | None] = mapped_column(
        Numeric
    )

    backup_battery_voltage: Mapped[float | None] = mapped_column(
        Numeric
    )

    backup_battery_percentage: Mapped[float | None] = mapped_column(
        Numeric
    )

    emergency_inverter_status: Mapped[str | None] = mapped_column(
        String(50)
    )

    lightning_protection_status: Mapped[str | None] = mapped_column(
        String(50)
    )

    optical_link_eop: Mapped[float | None] = mapped_column(
        Numeric
    )

    folder_path: Mapped[str | None] = mapped_column(
        String(500)
    )

    description: Mapped[str | None] = mapped_column(
        Text
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )