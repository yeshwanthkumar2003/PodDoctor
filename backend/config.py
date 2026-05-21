"""Central configuration loaded from environment variables."""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"

    # Database
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://poddoctor:poddoctor@localhost:5432/poddoctor",
    )

    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Celery
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

    # Credentials encryption key (Fernet 32-byte base64). Generate one for prod.
    FERNET_KEY = os.getenv("FERNET_KEY", "")

    # Groq
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")

    # Prometheus
    PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")

    # Misc
    REMEDIATION_DRY_RUN = os.getenv("REMEDIATION_DRY_RUN", "0") == "1"


config = Config()
