"""Kubernetes watchers — runs as long-lived Celery tasks (one per cluster)."""
import time

from kubernetes import watch  # type: ignore

from database.db import session_scope
from database.models import Cluster
from services.eks import get_credentials_for_user
from services.incidents import create_incident, severity_for
from services.kubernetes import build_api_client, core_v1
from services.websocket import broadcast
from tasks import celery_app
from utils.logger import get_logger

log = get_logger(__name__)


@celery_app.task(bind=True, name="tasks.watchers.start_cluster_watch")
def start_cluster_watch(self, cluster_id: int):
    """Reconnect-loop watching pods + events for a single cluster."""
    log.info("Starting watchers for cluster_id=%s", cluster_id)
    backoff = 2
    while True:
        try:
            with session_scope() as s:
                cluster = s.get(Cluster, cluster_id)
                if not cluster or cluster.status == "disconnected":
                    log.info("Cluster %s gone or disconnected — stopping", cluster_id)
                    return
                creds = get_credentials_for_user(cluster.user)
                cluster_name = cluster.name
                cluster_db_id = cluster.id
            if not creds:
                log.warning("No creds for cluster %s, retrying", cluster_id)
                time.sleep(10)
                continue

            api = build_api_client(*creds, cluster_name)
            _watch_events(api, cluster_db_id)
            backoff = 2
        except Exception as e:
            log.exception("Watcher crashed: %s — reconnecting in %ss", e, backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)


def _watch_events(api, cluster_id: int):
    """Stream Kubernetes events, raise incidents on bad reasons."""
    w = watch.Watch()
    v1 = core_v1(api)
    for ev in w.stream(v1.list_event_for_all_namespaces, timeout_seconds=600):
        obj = ev.get("object")
        if not obj:
            continue

        reason = obj.reason
        sev = severity_for(reason)

        payload = {
            "type": ev.get("type"),
            "reason": reason,
            "message": obj.message,
            "namespace": obj.metadata.namespace,
            "kind": (obj.involved_object.kind or "").lower(),
            "name": obj.involved_object.name,
        }
        broadcast("k8s:event", payload, room=f"cluster:{cluster_id}")

        if sev:
            create_incident(
                cluster_id=cluster_id,
                reason=reason,
                namespace=obj.metadata.namespace,
                resource_kind=obj.involved_object.kind or "Unknown",
                resource_name=obj.involved_object.name or "unknown",
                message=obj.message or "",
            )
