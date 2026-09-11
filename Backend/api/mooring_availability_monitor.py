from pathlib import Path
from uuid import UUID
from uuid import uuid4

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import Form
from fastapi import HTTPException
from fastapi import UploadFile

from sqlalchemy.orm import Session

from database.database import get_db

from schemas.mooring_availability_monitor_schema import (
    MooringAvailabilityMonitorCreate,
    MooringAvailabilityMonitorResponse
)

from services.mooring_availability_monitor_service import (
    MooringAvailabilityMonitorService
)


router = APIRouter(
    prefix="/api/v1/mooring-availability-monitor",
    tags=["Mooring Availability Monitor"]
)

service = MooringAvailabilityMonitorService()


BASE_DIR = Path(__file__).resolve().parent.parent

MOORING_STORAGE_DIR = (
    BASE_DIR
    / "storage"
    / "mooring-availability-monitor"
)


@router.post(
    "",
    response_model=MooringAvailabilityMonitorResponse,
    status_code=201
)
def create_mooring_availability_monitor(

    wind_speed: float | None = Form(None),

    winch_tension: float | None = Form(None),

    helium_pressure: float | None = Form(None),

    ambient_temperature: float | None = Form(None),

    backup_battery_voltage: float | None = Form(None),

    backup_battery_percentage: float | None = Form(None),

    emergency_inverter_status: str | None = Form(None),

    lightning_protection_status: str | None = Form(None),

    optical_link_eop: float | None = Form(None),

    description: str | None = Form(None),

    image: UploadFile | None = File(None),

    db: Session = Depends(get_db)
):

    # ==========================================
    # CREATE STORAGE DIRECTORY
    # ==========================================

    MOORING_STORAGE_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    # ==========================================
    # SAVE IMAGE
    # ==========================================

    image_path = None

    if image is not None:

        if not image.filename:

            raise HTTPException(
                status_code=400,
                detail="Invalid image filename"
            )

        extension = (
            Path(image.filename)
            .suffix
            .lower()
        )

        allowed_extensions = {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        }

        if extension not in allowed_extensions:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported image format. "
                    "Allowed: jpg, jpeg, png, webp"
                )
            )

        filename = (
            f"{uuid4()}"
            f"{extension}"
        )

        physical_path = (
            MOORING_STORAGE_DIR
            / filename
        )

        with open(
            physical_path,
            "wb"
        ) as buffer:

            buffer.write(
                image.file.read()
            )

        # ======================================
        # PATH YANG DISIMPAN KE DATABASE
        # ======================================

        image_path = str(
            Path(
                "storage",
                "mooring-availability-monitor",
                filename
            )
        )

    # ==========================================
    # CREATE DATA
    # ==========================================

    data = MooringAvailabilityMonitorCreate(

        wind_speed=wind_speed,

        winch_tension=winch_tension,

        helium_pressure=helium_pressure,

        ambient_temperature=(
            ambient_temperature
        ),

        backup_battery_voltage=(
            backup_battery_voltage
        ),

        backup_battery_percentage=(
            backup_battery_percentage
        ),

        emergency_inverter_status=(
            emergency_inverter_status
        ),

        lightning_protection_status=(
            lightning_protection_status
        ),

        optical_link_eop=optical_link_eop,

        description=description
    )

    # ==========================================
    # SAVE TO DATABASE
    # ==========================================

    try:

        return service.create(
            db,
            data,
            image_path
        )

    except Exception:

        # DB gagal → hapus image yang sudah disimpan

        if image_path:

            physical_path.unlink(
                missing_ok=True
            )

        raise


@router.get(
    "",
    response_model=list[
        MooringAvailabilityMonitorResponse
    ]
)
def get_mooring_availability_monitors(
    db: Session = Depends(get_db)
):

    return service.get_all(
        db
    )


@router.get(
    "/{monitor_id}",
    response_model=MooringAvailabilityMonitorResponse
)
def get_mooring_availability_monitor(
    monitor_id: UUID,
    db: Session = Depends(get_db)
):

    monitor = service.get_by_id(
        db,
        monitor_id
    )

    if monitor is None:

        raise HTTPException(
            status_code=404,
            detail="Mooring availability monitor not found"
        )

    return monitor