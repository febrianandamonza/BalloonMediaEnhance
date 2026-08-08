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


# image = cv2.imread('input/temp.jpeg')

# if image is None:
#     raise Exception("Image not found or unable to load.")


# print("Ukuran gambar:", image.shape)

# cv2.imshow('Original', image)
# cv2.waitKey(0)
# cv2.destroyAllWindows()


# enhancer = ImageEnhancer()

# enhancer.load_model()

# result = enhancer.enhance_image(
#     "input/images2.png"
# )

# print(result)


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

app.include_router(enhance_router)
app.include_router(detection_router)
app.include_router(crowd_counting_router)


app.mount(
    "/output",
    StaticFiles(directory=BASE_DIR / "output"),
    name="output"
)


