"""Safe Kubernetes remediation actions."""
from datetime import datetime, timezone

from kubernetes import client  # type: ignore

from config import config
from database.db import session_scope
from database.models import AuditLog, RemediationHistory
from services.kubernetes import apps_v1, core_v1
from services.websocket import broadcast
from utils.helpers import serialize
from utils.logger import get_logger

log = get_logger(__name__)

SAFE_ACTIONS = {"restart_deployment", "rollout_restart", "delete_pod", "scale_deployment"}
FORBIDDEN_ACTIONS = {"delete_namespace", "delete_pvc", "terminate_node"}


def _audit(user_id: int | None, cluster_id: int, action: str, detail: dict) -> None:
    with session_scope() as s:
        s.add(AuditLog(user_id=user_id, cluster_id=cluster_id, action=action, detail=detail))


def _record(rec_id: int, **fields) -> dict | None:
    with session_scope() as s:
        rh = s.get(RemediationHistory, rec_id)
        if not rh:
            return None
        for k, v in fields.items():
            setattr(rh, k, v)
        s.flush()
        return serialize(rh)


def execute(
    *,
    api: client.ApiClient,
    cluster_id: int,
    user_id: int | None,
    action: str,
    namespace: str,
    target: str,
    replicas: int | None = None,
    incident_id: int | None = None,
    dry_run: bool = False,
) -> dict:
    """Execute a safe remediation action. Returns the audit record dict."""
    if action in FORBIDDEN_ACTIONS:
        raise PermissionError(f"Action '{action}' is forbidden")
    if action not in SAFE_ACTIONS:
        raise ValueError(f"Unknown action '{action}'")

    effective_dry = dry_run or config.REMEDIATION_DRY_RUN

    # create history row
    with session_scope() as s:
        rh = RemediationHistory(
            incident_id=incident_id,
            cluster_id=cluster_id,
            action=action,
            namespace=namespace,
            target=target,
            dry_run=effective_dry,
            status="running",
        )
        s.add(rh)
        s.flush()
        rec_id = rh.id
        snapshot = serialize(rh)

    broadcast("remediation:start", snapshot)
    _audit(user_id, cluster_id, f"remediation.{action}.start",
           {"namespace": namespace, "target": target, "dry_run": effective_dry})

    try:
        if effective_dry:
            result = f"dry-run: would {action} {namespace}/{target}"
        elif action == "delete_pod":
            core_v1(api).delete_namespaced_pod(name=target, namespace=namespace, grace_period_seconds=0)
            result = f"deleted pod {namespace}/{target}"
        elif action in ("restart_deployment", "rollout_restart"):
            ts = datetime.now(timezone.utc).isoformat()
            body = {
                "spec": {
                    "template": {
                        "metadata": {
                            "annotations": {"poddoctor.io/restartedAt": ts}
                        }
                    }
                }
            }
            apps_v1(api).patch_namespaced_deployment(name=target, namespace=namespace, body=body)
            result = f"rollout-restarted deployment {namespace}/{target}"
        elif action == "scale_deployment":
            if replicas is None:
                raise ValueError("replicas required for scale_deployment")
            apps_v1(api).patch_namespaced_deployment_scale(
                name=target, namespace=namespace,
                body={"spec": {"replicas": int(replicas)}},
            )
            result = f"scaled deployment {namespace}/{target} to {replicas}"
        else:
            raise ValueError(action)

        updated = _record(rec_id, status="success", result=result)
        broadcast("remediation:done", updated)
        _audit(user_id, cluster_id, f"remediation.{action}.success",
               {"namespace": namespace, "target": target, "result": result})
        return updated or snapshot

    except Exception as e:
        log.exception("Remediation failed")
        updated = _record(rec_id, status="failed", result=str(e))
        broadcast("remediation:failed", updated)
        _audit(user_id, cluster_id, f"remediation.{action}.failed",
               {"namespace": namespace, "target": target, "error": str(e)})
        return updated or snapshot
