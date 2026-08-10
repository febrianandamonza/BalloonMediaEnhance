from datetime import datetime
from uuid import UUID

from sqlalchemy import BigInteger
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy import Text

from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from database.database import Base


class AuditLog(Base):

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id")
    )

    module_id: Mapped[int | None] = mapped_column(
        ForeignKey("audit_modules.id")
    )

    action: Mapped[str | None] = mapped_column(
        String(50)
    )

    entity: Mapped[str | None] = mapped_column(
        String(100)
    )

    entity_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True)
    )

    description: Mapped[str | None] = mapped_column(
        Text
    )

    ip_address: Mapped[str | None] = mapped_column(
        String(50)
    )

    user_agent: Mapped[str | None] = mapped_column(
        Text
    )

    status: Mapped[str | None] = mapped_column(
        String(30)
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime
    )

    user = relationship("User")

    module = relationship("AuditModule")