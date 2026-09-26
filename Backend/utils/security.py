import os

from datetime import datetime
from datetime import timedelta

from dotenv import load_dotenv

from jose import jwt, JWTError

from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

SECRET_KEY = os.getenv("JWT_SECRET_KEY")

ALGORITHM = os.getenv("JWT_ALGORITHM")

EXPIRE_MINUTES = int(
    os.getenv("JWT_EXPIRE_MINUTES")
)

REFRESH_EXPIRE_DAYS = int(
    os.getenv("JWT_REFRESH_EXPIRE_DAYS")
)


def create_refresh_token(
    data: dict
):

    payload = data.copy()

    expire = datetime.utcnow() + timedelta(
        days=REFRESH_EXPIRE_DAYS
    )

    payload["exp"] = expire

    payload["type"] = "refresh"

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def decode_access_token(
    token: str
):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        
        return payload

    except JWTError:
        return None


def hash_password(
    password: str
):

    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
):

    return pwd_context.verify(
        plain_password,
        hashed_password
    )


def create_access_token(
    data: dict
):

    payload = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=EXPIRE_MINUTES
    )

    payload["exp"] = expire

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def get_token_expire_seconds() -> int:

    return EXPIRE_MINUTES * 60