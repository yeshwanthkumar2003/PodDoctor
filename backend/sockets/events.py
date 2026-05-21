"""Flask-SocketIO event registration."""
from flask_socketio import SocketIO, emit, join_room, leave_room

from utils.logger import get_logger

log = get_logger(__name__)

# Single SocketIO instance — initialized in app.py via socketio.init_app()
socketio = SocketIO(cors_allowed_origins="*", async_mode="eventlet")


def register_socket_events(sio: SocketIO) -> None:
    @sio.on("connect")
    def on_connect():
        log.info("client connected")
        emit("server:hello", {"msg": "connected to poddoctor"})

    @sio.on("disconnect")
    def on_disconnect():
        log.info("client disconnected")

    @sio.on("cluster:subscribe")
    def on_subscribe(data):
        room = f"cluster:{data.get('cluster_id')}"
        join_room(room)
        emit("server:subscribed", {"room": room})

    @sio.on("cluster:unsubscribe")
    def on_unsubscribe(data):
        room = f"cluster:{data.get('cluster_id')}"
        leave_room(room)
        emit("server:unsubscribed", {"room": room})
