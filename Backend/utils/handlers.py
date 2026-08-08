from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import JSONResponse

from utils.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException
)


def register_exception_handlers(
    app: FastAPI
):

    @app.exception_handler(NotFoundException)
    async def not_found_handler(
        request: Request,
        exc: NotFoundException
    ):

        return JSONResponse(

            status_code=404,

            content={

                "success": False,

                "message": exc.message

            }

        )

    @app.exception_handler(ConflictException)
    async def conflict_handler(
        request: Request,
        exc: ConflictException
    ):

        return JSONResponse(

            status_code=409,

            content={

                "success": False,

                "message": exc.message

            }

        )

    @app.exception_handler(BadRequestException)
    async def bad_request_handler(
        request: Request,
        exc: BadRequestException
    ):

        return JSONResponse(

            status_code=400,

            content={

                "success": False,

                "message": exc.message

            }

        )

    @app.exception_handler(UnauthorizedException)
    async def unauthorized_handler(
        request: Request,
        exc: UnauthorizedException
    ):

        return JSONResponse(

            status_code=401,

            content={

                "success": False,

                "message": exc.message

            }

        )

    @app.exception_handler(ForbiddenException)
    async def forbidden_handler(
        request: Request,
        exc: ForbiddenException
    ):

        return JSONResponse(

            status_code=403,

            content={

                "success": False,

                "message": exc.message

            }

        )