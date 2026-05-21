"""Websocket broadcast helper — runs from any process via Redis message_queue."""
from typing import Any

from flask_socketio import SocketIO  # type: ignore

from config import config
from utils.logger import get_logger

log = get_logger(__name__)

# A SocketIO instance bound to the same Redis message queue. Calling .emit()
# from Celery workers / watcher threads will fan out to every connected client.
_emitter: SocketIO | None = None


def get_emitter() -> SocketIO:
    global _emitter
    if _emitter is None:
        _emitter = SocketIO(message_queue=config.REDIS_URL, async_mode="eventlet")
    return _emitter


def broadcast(event: str, payload: Any, room: str | None = None) -> None:
    """Broadcast an event to all clients (or a room)."""
    try:
        emitter = get_emitter()
        if room:
            emitter.emit(event, payload, to=room)
        else:
            emitter.emit(event, payload)
    except Exception as e:
        log.warning("broadcast(%s) failed: %s", event, e)
