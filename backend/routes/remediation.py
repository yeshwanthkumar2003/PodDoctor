"""Remediation execution endpoint."""
from flask import Blueprint, jsonify, request

from tasks.remediation import run_remediation

remediation_bp = Blueprint("remediation", __name__)


@remediation_bp.post("/execute")
def execute_remediation():
    """Body: {cluster_id, action, namespace, target, replicas?, incident_id?, dry_run?}."""
    data = request.get_json(force=True) or {}
    required = ["cluster_id", "action", "namespace", "target"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify(error=f"missing fields: {missing}"), 400

    task = run_remediation.delay(
        cluster_id=int(data["cluster_id"]),
        action=str(data["action"]),
        namespace=str(data["namespace"]),
        target=str(data["target"]),
        replicas=data.get("replicas"),
        incident_id=data.get("incident_id"),
        dry_run=bool(data.get("dry_run", False)),
    )
    return jsonify(task_id=task.id, status="queued"), 202
