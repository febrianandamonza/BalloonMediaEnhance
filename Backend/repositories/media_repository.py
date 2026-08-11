from sqlalchemy.orm import joinedload

from entities.media import Media

from repositories.base_repository import BaseRepository


class MediaRepository(
    BaseRepository[Media]
):

    def __init__(self):

        super().__init__(Media)

    def get_all(
        self,
        db
    ):

        return (

            db.query(Media)

            .options(

                joinedload(
                    Media.uploader
                )

            )

            .order_by(
                Media.uploaded_at.desc()
            )

            .all()

        )

    def get_by_id(
        self,
        db,
        media_id
    ):

        return (

            db.query(Media)

            .options(

                joinedload(
                    Media.uploader
                )

            )

            .filter(
                Media.id == media_id
            )

            .first()

        )