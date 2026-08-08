class AppException(Exception):

    def __init__(
        self,
        message: str
    ):

        self.message = message


class NotFoundException(AppException):
    pass


class ConflictException(AppException):
    pass


class BadRequestException(AppException):
    pass


class UnauthorizedException(AppException):
    pass


class ForbiddenException(AppException):
    pass