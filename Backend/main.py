# import cv2

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

app.include_router(enhance_router)
app.include_router(detection_router)
app.include_router(crowd_counting_router)


app.mount(
    "/output",
    StaticFiles(directory=BASE_DIR / "output"),
    name="output"
)


