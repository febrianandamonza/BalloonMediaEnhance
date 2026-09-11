from datetime import datetime
from uuid import UUID
from uuid import uuid4

from entities.mooring_availability_monitor import (
    MooringAvailabilityMonitor
)

from repositories.base_repository import BaseRepository


class MooringAvailabilityMonitorRepository(
    BaseRepository[MooringAvailabilityMonitor]
):

    def __init__(self):

        super().__init__(
            MooringAvailabilityMonitor
        )

    def get_all(self, db):

        return (
            db.query(
                MooringAvailabilityMonitor
            )
            .order_by(
                MooringAvailabilityMonitor.created_at.desc()
            )
            .all()
        )

    def get_by_id(
        self,
        db,
        monitor_id: UUID
    ):

        return (
            db.query(
                MooringAvailabilityMonitor
            )
            .filter(
                MooringAvailabilityMonitor.id == monitor_id
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

        monitor = MooringAvailabilityMonitor(

            id=uuid4(),

            wind_speed=data.wind_speed,

            winch_tension=data.winch_tension,

            helium_pressure=data.helium_pressure,

            ambient_temperature=(
                data.ambient_temperature
            ),

            backup_battery_voltage=(
                data.backup_battery_voltage
            ),

            backup_battery_percentage=(
                data.backup_battery_percentage
            ),

            emergency_inverter_status=(
                data.emergency_inverter_status
            ),

            lightning_protection_status=(
                data.lightning_protection_status
            ),

            optical_link_eop=data.optical_link_eop,

            # Kolom folder_path digunakan
            # untuk menyimpan path file image
            folder_path=image_path,

            description=data.description,

            created_at=now,

            updated_at=now
        )

        db.add(monitor)

        db.commit()

        db.refresh(monitor)

        return monitor