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

from schemas.tether_cable_monitor_schema import (
    TetherCableMonitorCreate,
    TetherCableMonitorResponse
)

from services.tether_cable_monitor_service import (
    TetherCableMonitorService
)


router = APIRouter(
    prefix="/api/v1/tether-cable-monitor",
    tags=["Tether Cable Monitor"]
)

service = TetherCableMonitorService()


BASE_DIR = Path(__file__).resolve().parent.parent

TETHER_STORAGE_DIR = (
    BASE_DIR
    / "storage"
    / "tether-cable-monitor"
)


@router.post(
    "",
    response_model=TetherCableMonitorResponse,
    status_code=201
)
def create_tether_cable_monitor(
    operating_voltage: float | None = Form(None),
    load_current: float | None = Form(None),
    insulation_resistance: float | None = Form(None),
    conductor_continuity: str | None = Form(None),
    optical_snr: float | None = Form(None),
    optical_attenuation: float | None = Form(None),
    sheath_temperature: float | None = Form(None),
    kevlar_tension: float | None = Form(None),
    description: str | None = Form(None),

    image: UploadFile | None = File(None),

    db: Session = Depends(get_db)
):

    # ==========================================
    # CREATE STORAGE FOLDER
    # ==========================================

    TETHER_STORAGE_DIR.mkdir(
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
            TETHER_STORAGE_DIR
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
                "tether-cable-monitor",
                filename
            )
        )

    # ==========================================
    # CREATE DATA
    # ==========================================

    data = TetherCableMonitorCreate(

        operating_voltage=operating_voltage,

        load_current=load_current,

        insulation_resistance=(
            insulation_resistance
        ),

        conductor_continuity=(
            conductor_continuity
        ),

        optical_snr=optical_snr,

        optical_attenuation=(
            optical_attenuation
        ),

        sheath_temperature=(
            sheath_temperature
        ),

        kevlar_tension=kevlar_tension,

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

        # Kalau DB gagal, hapus image
        # supaya tidak meninggalkan file orphan

        if image_path:

            physical_path.unlink(
                missing_ok=True
            )

        raise


@router.get(
    "",
    response_model=list[
        TetherCableMonitorResponse
    ]
)
def get_tether_cable_monitors(
    db: Session = Depends(get_db)
):

    return service.get_all(
        db
    )


@router.get(
    "/{monitor_id}",
    response_model=TetherCableMonitorResponse
)
def get_tether_cable_monitor(
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
            detail="Tether cable monitor not found"
        )

    return monitor