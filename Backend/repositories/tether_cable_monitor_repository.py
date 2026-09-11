from datetime import datetime
from uuid import UUID
from uuid import uuid4

from entities.tether_cable_monitor import (
    TetherCableMonitor
)

from repositories.base_repository import BaseRepository


class TetherCableMonitorRepository(
    BaseRepository[TetherCableMonitor]
):

    def __init__(self):

        super().__init__(
            TetherCableMonitor
        )

    def get_all(self, db):

        return (
            db.query(TetherCableMonitor)
            .order_by(
                TetherCableMonitor.created_at.desc()
            )
            .all()
        )

    def get_by_id(
        self,
        db,
        monitor_id: UUID
    ):

        return (
            db.query(TetherCableMonitor)
            .filter(
                TetherCableMonitor.id == monitor_id
            )
            .first()
        )

    def create_monitor(
        self,
        db,
        data,
        image_path
    ):

        now = datetime.utcnow()

        monitor = TetherCableMonitor(

            id=uuid4(),

            operating_voltage=data.operating_voltage,

            load_current=data.load_current,

            insulation_resistance=(
                data.insulation_resistance
            ),

            conductor_continuity=(
                data.conductor_continuity
            ),

            optical_snr=data.optical_snr,

            optical_attenuation=(
                data.optical_attenuation
            ),

            sheath_temperature=(
                data.sheath_temperature
            ),

            kevlar_tension=data.kevlar_tension,

            # Tetap menggunakan kolom folder_path
            # untuk menyimpan PATH FILE IMAGE
            folder_path=image_path,

            description=data.description,

            created_at=now,

            updated_at=now
        )

        db.add(monitor)

        db.commit()

        db.refresh(monitor)

        return monitor