from typing import Generic, TypeVar

from sqlalchemy.orm import Session

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):

    def __init__(self, model):
        self.model = model

    def get_all(self, db: Session):

        return (
            db.query(self.model)
            .all()
        )

    def get_by_id(
        self,
        db: Session,
        id
    ):

        return (
            db.query(self.model)
            .filter(self.model.id == id)
            .first()
        )

    def create(
        self,
        db: Session,
        obj
    ):

        db.add(obj)
        db.commit()
        db.refresh(obj)

        return obj

    def update(
        self,
        db: Session,
        obj
    ):

        db.commit()
        db.refresh(obj)

        return obj

    def delete(
        self,
        db: Session,
        obj
    ):

        db.delete(obj)
        db.commit()