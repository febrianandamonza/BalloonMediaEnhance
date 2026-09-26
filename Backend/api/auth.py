from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Security
from fastapi import Request

from sqlalchemy.orm import Session

from database.database import get_db

from services.auth_service import AuthService

from schemas.auth_schema import (
    CurrentUserResponse,
    LoginResponse,
    RefreshRequest,
    RegisterRequest,
    LoginRequest
)

from schemas.user_schema import UserResponse
from dependencies.authentication import get_current_user

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

service = AuthService()


@router.post(
    "/refresh"
)
def refresh(
    request: RefreshRequest,
    db: Session = Depends(get_db)
):

    return service.refresh(
        db,
        request.refresh_token
    )


@router.get(
    "/me",
    response_model=CurrentUserResponse
)
def me(

    current_user = Security(get_current_user)
):


    return current_user


@router.post(
    "/login",
    response_model=LoginResponse
)
def login(
    http_request: Request,
    request: LoginRequest,
    db: Session = Depends(get_db)
):

    return service.login(
        db,
        http_request,
        request
    )


@router.post(
    "/register",
    response_model=UserResponse
)
def register(
    http_request: Request,
    request: RegisterRequest,
    db: Session = Depends(get_db)
):


    return service.register(
       db,
        http_request,
        request
    )