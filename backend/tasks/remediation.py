"""Remediation Celery task."""
from database.db import session_scope
from database.models import Cluster
from services.eks import get_credentials_for_user
from services.kubernetes import build_api_client
from services.remediation import execute
from tasks import celery_app
from utils.logger import get_logger

log = get_logger(__name__)


@celery_app.task(name="tasks.remediation.run_remediation")
def run_remediation(
    *,
    cluster_id: int,
    action: str,
    namespace: str,
    target: str,
    replicas: int | None = None,
    incident_id: int | None = None,
    dry_run: bool = False,
):
    with session_scope() as s:
        cluster = s.get(Cluster, cluster_id)
        if not cluster:
            return {"error": "cluster not found"}
        creds = get_credentials_for_user(cluster.user)
        user_id = cluster.user_id
        cname = cluster.name
    if not creds:
        return {"error": "credentials unavailable"}

    api = build_api_client(*creds, cname)
    return execute(
        api=api,
        cluster_id=cluster_id,
        user_id=user_id,
        action=action,
        namespace=namespace,
        target=target,
        replicas=replicas,
        incident_id=incident_id,
        dry_run=dry_run,
    )
