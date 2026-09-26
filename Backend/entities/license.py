from datetime import datetime, date
from uuid import UUID

from sqlalchemy import DateTime
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import Date

from sqlalchemy.dialects.postgresql import UUID as PG_UUID


from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship


from database.database import Base


class License(Base):

    __tablename__ = "licenses"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True
    )

    license_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    license_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime
    )

    issued_date : Mapped[date | None] = mapped_column(
        Date)

    expired_date : Mapped[date | None] = mapped_column(
        Date)

    user_licenses = relationship(
        "UserLicense",
        back_populates="license"
    )