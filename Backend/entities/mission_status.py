from sqlalchemy import BigInteger
from sqlalchemy import String
from sqlalchemy import Text

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from database.database import Base


class MissionStatus(Base):

    __tablename__ = "mission_status"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    name: Mapped[str | None] = mapped_column(
        String(50)
    )

    description: Mapped[str | None] = mapped_column(
        Text
    )

    missions = relationship(
        "FlightMission",
        back_populates="mission_status"
    )
