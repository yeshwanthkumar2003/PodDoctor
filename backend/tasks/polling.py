"""Periodic polling — metrics broadcaster + AI analysis kickoff."""
from database.db import session_scope
from database.models import Cluster, Incident, User
from services.ai import analyze_incident
from services.eks import get_credentials_for_user
from services.incidents import update_incident
from services.kubernetes import build_api_client, pod_logs
from services.metrics import cluster_overview
from services.websocket import broadcast
from tasks import celery_app
from utils.logger import get_logger
from utils.security import decrypt

log = get_logger(__name__)


@celery_app.task(name="tasks.polling.poll_metrics")
def poll_metrics():
    """Fetch Prometheus overview + broadcast to all subscribed clients."""
    overview = cluster_overview()
    broadcast("metrics:tick", overview)
    return overview


@celery_app.task(name="tasks.polling.analyze_pending_incidents")
def analyze_pending_incidents():
    """Run AI analysis on incidents that don't have one yet."""
    with session_scope() as s:
        pending = (
            s.query(Incident)
            .filter(Incident.status.in_(["detected"]))
            .filter(Incident.root_cause.is_(None))
            .limit(10)
            .all()
        )
        ids = [(i.id, i.cluster_id, i.namespace, i.resource_name, i.reason, i.message)
               for i in pending]

    for inc_id, cluster_id, ns, name, reason, message in ids:
        logs_txt = ""
        try:
            with session_scope() as s:
                cluster = s.get(Cluster, cluster_id)
                user: User | None = cluster.user if cluster else None
                creds = get_credentials_for_user(user) if user else None
                groq_key = decrypt(user.groq_api_key_enc) if (user and user.groq_api_key_enc) else None
                cname = cluster.name if cluster else None
            if creds and cname and ns and name:
                api = build_api_client(*creds, cname)
                logs_txt = pod_logs(api, ns, name)
        except Exception as e:
            log.warning("could not fetch logs for incident %s: %s", inc_id, e)

        result = analyze_incident(
            reason=reason, namespace=ns, resource_name=name,
            message=message, logs=logs_txt, api_key=groq_key,
        )
        update_incident(
            inc_id,
            status="analyzing",
            root_cause=result["root_cause"],
            confidence=result["confidence"],
            suggested_fix=result["suggested_fix"],
        )
