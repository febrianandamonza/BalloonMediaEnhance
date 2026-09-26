from datetime import datetime
from uuid import UUID, uuid4

from repositories.base_repository import BaseRepository
from entities.tether_cable_api import TetherCableAPI


class TetherCableAPIRepository(BaseRepository[TetherCableAPI]):
    def __init__(self):
        super().__init__(TetherCableAPI)

    def get_all(self, db):
        return (
            db.query(TetherCableAPI)
            .order_by(TetherCableAPI.created_at.desc())
            .all()
        )

    def get_by_uid(self, db, uid: UUID):
        return (
            db.query(TetherCableAPI)
            .filter(TetherCableAPI.uid == uid)
            .first()
        )

    def create_live(self, db, udp_url: str):
        now = datetime.utcnow()

        log = TetherCableAPI(
            uid=uuid4(),
            status="live",
            udp_url=udp_url,
            created_at=now,
            stopped_at=None
        )

        db.add(log)
        db.commit()
        db.refresh(log)

        return log

    def stop(self, db, uid: UUID):
        log = (
            db.query(TetherCableAPI)
            .filter(TetherCableAPI.uid == uid)
            .first()
        )

        if not log:
            return None

        log.status = "stopped"
        log.stopped_at = datetime.utcnow()

        db.commit()
        db.refresh(log)

        return log