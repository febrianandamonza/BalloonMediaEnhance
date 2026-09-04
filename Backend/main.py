# import cv2

import mimetypes

from services.enhancer import ImageEnhancer
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from pathlib import Path

from utils.handlers import register_exception_handlers

from api.enhance import router as enhance_router
from api.detection import router as detection_router
from api.crowd_counting import router as crowd_counting_router
from api.crowd_counting_live import router as crowd_counting_live_router
from api.network_stream import router as network_stream_router

# Di beberapa mesin Windows, registry mengasosiasikan .ts dengan
# "text/plain" (bentrok dengan file TypeScript) alih-alih MPEG-TS.
# Paksa mapping yang benar supaya browser mau memutar segmen HLS.
mimetypes.add_type("video/mp2t", ".ts")
mimetypes.add_type("application/vnd.apple.mpegurl", ".m3u8")

from api.role import router as role_router
from api.user import router as user_router
from api.license import router as license_router
from api.license_status import router as license_status_router
from api.auth import router as auth_router
from api.user_license import router as user_license_router
from api.flight_simulation import router as flight_simulation_router
from api.flight_mission import router as flight_mission_router
from api.mission_status import router as mission_status_router
from api.location import router as location_router
from api.balloon import router as balloon_router
from api.flight_information import router as flight_information_router
from api.audit_module import router as audit_module_router
from api.audit_log import router as audit_log_router
from api.media import router as media_router
from api.notification import router as notification_router
from api.dashboard import router as dashboard_router


app = FastAPI(
    title="EnhanceAI API",
    version="1.0.0"
)

register_exception_handlers(app)


BASE_DIR = Path(__file__).resolve().parent

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(role_router)
app.include_router(user_router)
app.include_router(license_router)
app.include_router(license_status_router)
app.include_router(user_license_router)
app.include_router(flight_simulation_router)
app.include_router(flight_mission_router)
app.include_router(flight_information_router)
app.include_router(mission_status_router)
app.include_router(location_router)
app.include_router(balloon_router)
app.include_router(audit_module_router)
app.include_router(audit_log_router)
app.include_router(media_router)
app.include_router(notification_router)
app.include_router(dashboard_router)

app.include_router(enhance_router)
app.include_router(detection_router)
app.include_router(crowd_counting_router)
app.include_router(crowd_counting_live_router)
app.include_router(network_stream_router)


app.mount(
    "/storage",
    StaticFiles(directory=BASE_DIR / "storage"),
    name="storage"
)

app.mount(
    "/stream",
    StaticFiles(directory=BASE_DIR / "streams"),
    name="stream"
)


