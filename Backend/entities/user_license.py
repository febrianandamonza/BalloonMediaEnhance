from datetime import date
from datetime import datetime
from uuid import UUID

from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy import Text

from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from database.database import Base


class UserLicense(Base):

    __tablename__ = "user_licenses"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    license_id: Mapped[UUID] = mapped_column(
        ForeignKey("licenses.id"),
        nullable=False
    )

    status_id: Mapped[int] = mapped_column(
        ForeignKey("license_status.id"),
        nullable=False
    )

    license_number: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    issued_by: Mapped[str | None] = mapped_column(
        String(150)
    )

    issued_date: Mapped[date | None] = mapped_column(
        Date
    )

    expired_date: Mapped[date | None] = mapped_column(
        Date
    )

    document_path: Mapped[str | None] = mapped_column(
        Text
    )

    remarks: Mapped[str | None] = mapped_column(
        Text
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime
    )

    user = relationship(
        "User",
        back_populates="user_licenses"
    )

    license = relationship(
        "License",
        back_populates="user_licenses"
    )

    status = relationship(
        "LicenseStatus",
        back_populates="user_licenses"
    )