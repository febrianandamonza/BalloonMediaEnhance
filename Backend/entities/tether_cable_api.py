import uuid

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from database.database import Base


class TetherCableAPI(Base):
    __tablename__ = "tether_cable_stream_logs"

    uid: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    udp_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    stopped_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )