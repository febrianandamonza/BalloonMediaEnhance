from datetime import datetime

from sqlalchemy import BigInteger
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import Boolean
from sqlalchemy import DateTime
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from database.database import Base


class Notification(Base):

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text
    )

    level: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="terbuka"
    )

    isRead: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )

    source: Mapped[str | None] = mapped_column(
        String(255)
    )

    metadata_: Mapped[dict | None] = mapped_column(
        "metadata",
        JSON
    )

    createdAt: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    updatedAt: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )