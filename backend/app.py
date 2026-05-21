"""PodDoctor Flask application entrypoint."""
from flask import Flask, jsonify
from flask_cors import CORS

from config import config
from database.db import init_db
from sockets.events import socketio, register_socket_events
from utils.logger import get_logger

# Blueprints
from routes.auth import auth_bp
from routes.eks import eks_bp
from routes.topology import topology_bp
from routes.incidents import incidents_bp
from routes.remediation import remediation_bp
from routes.metrics import metrics_bp

log = get_logger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(config)

    CORS(app, resources={r"/*": {"origins": config.CORS_ORIGINS}}, supports_credentials=True)

    # DB
    init_db()

    # Blueprints
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(eks_bp, url_prefix="/eks")
    app.register_blueprint(topology_bp, url_prefix="/topology")
    app.register_blueprint(incidents_bp, url_prefix="/incidents")
    app.register_blueprint(remediation_bp, url_prefix="/remediation")
    app.register_blueprint(metrics_bp, url_prefix="/metrics")

    @app.get("/health")
    def health():
        return jsonify(status="ok", service="poddoctor-backend")

    # SocketIO
    socketio.init_app(app, cors_allowed_origins=config.CORS_ORIGINS, message_queue=config.REDIS_URL)
    register_socket_events(socketio)

    log.info("PodDoctor backend ready")
    return app


app = create_app()


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8000, debug=config.DEBUG, allow_unsafe_werkzeug=True)
