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


class TetherCableMonitor(Base):

    __tablename__ = "tether_cable_monitors"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True
    )

    operating_voltage: Mapped[float | None] = mapped_column(
        Numeric
    )

    load_current: Mapped[float | None] = mapped_column(
        Numeric
    )

    insulation_resistance: Mapped[float | None] = mapped_column(
        Numeric
    )

    conductor_continuity: Mapped[str | None] = mapped_column(
        String(50)
    )

    optical_snr: Mapped[float | None] = mapped_column(
        Numeric
    )

    optical_attenuation: Mapped[float | None] = mapped_column(
        Numeric
    )

    sheath_temperature: Mapped[float | None] = mapped_column(
        Numeric
    )

    kevlar_tension: Mapped[float | None] = mapped_column(
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