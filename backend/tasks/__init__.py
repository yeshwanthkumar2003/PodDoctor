"""Celery app instance + autodiscovery."""
from celery import Celery

from config import config

celery_app = Celery(
    "poddoctor",
    broker=config.CELERY_BROKER_URL,
    backend=config.CELERY_RESULT_BACKEND,
    include=["tasks.watchers", "tasks.polling", "tasks.remediation"],
)

celery_app.conf.update(
    task_acks_late=True,
    task_track_started=True,
    worker_max_tasks_per_child=200,
    timezone="UTC",
    beat_schedule={
        "poll-metrics-every-30s": {
            "task": "tasks.polling.poll_metrics",
            "schedule": 30.0,
        },
    },
)
