from typing import Generic, TypeVar

RepositoryType = TypeVar("RepositoryType")


class BaseService(Generic[RepositoryType]):

    def __init__(self, repository: RepositoryType):
        self.repository = repository

    def get_all(self, db):

        return self.repository.get_all(db)

    def get_by_id(
        self,
        db,
        id
    ):

        return self.repository.get_by_id(
            db,
            id
        )

    def create(
        self,
        db,
        obj
    ):

        return self.repository.create(
            db,
            obj
        )

    def update(
        self,
        db,
        obj
    ):

        return self.repository.update(
            db,
            obj
        )

    def delete(
        self,
        db,
        obj
    ):

        return self.repository.delete(
            db,
            obj
        )