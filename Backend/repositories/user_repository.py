from sqlalchemy.orm import Session, joinedload

from entities.user import User

from repositories.base_repository import BaseRepository


class UserRepository(
    BaseRepository[User]
):

    def __init__(self):

        super().__init__(User)


    def get_all(
        self,
        db: Session
    ):

        return (
            db.query(User)
            .options(
                joinedload(User.role)
            )
            .all()
        )

    def get_by_username(
        self,
        db: Session,
        username: str
    ):

        return (
            db.query(User)
            .options(
                joinedload(User.role)
            )
            .filter(User.username == username)
            .first()
        )

    def update(
        self,
        db: Session,
        user: User
    ):

        db.commit()
        db.refresh(user)

        return user


    def get_by_id(
        self,
        db,
        user_id
    ):

        return (

            db.query(User)
            .options(
                joinedload(User.role)
            )
            .filter(
                User.id == user_id
            )
            .first()

        )