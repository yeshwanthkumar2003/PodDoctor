"""Incident detection + storage."""
from datetime import datetime
from typing import Optional

from database.db import session_scope
from database.models import Incident
from services.websocket import broadcast
from utils.helpers import now_iso, serialize
from utils.logger import get_logger

log = get_logger(__name__)

BAD_REASONS = {
    "CrashLoopBackOff": "critical",
    "OOMKilled": "critical",
    "ImagePullBackOff": "critical",
    "ErrImagePull": "critical",
    "CreateContainerConfigError": "critical",
    "FailedScheduling": "warning",
    "NodeNotReady": "critical",
    "MemoryPressure": "warning",
    "DiskPressure": "warning",
    "Evicted": "warning",
}


def severity_for(reason: str | None) -> Optional[str]:
    if not reason:
        return None
    return BAD_REASONS.get(reason)


def append_timeline(incident: Incident, kind: str, message: str) -> None:
    tl = list(incident.timeline or [])
    tl.append({"ts": now_iso(), "kind": kind, "message": message})
    incident.timeline = tl


def create_incident(
    *,
    cluster_id: int,
    reason: str,
    namespace: str | None,
    resource_kind: str,
    resource_name: str,
    message: str,
) -> dict:
    """Idempotently create an incident; broadcasts a websocket event."""
    sev = severity_for(reason) or "warning"

    with session_scope() as s:
        # de-dupe — open incident on same resource + reason within 10 minutes
        existing = (
            s.query(Incident)
            .filter_by(
                cluster_id=cluster_id,
                resource_kind=resource_kind,
                resource_name=resource_name,
                reason=reason,
            )
            .filter(Incident.status != "resolved")
            .first()
        )
        if existing:
            append_timeline(existing, "detect", message)
            existing.updated_at = datetime.utcnow()
            s.flush()
            payload = serialize(existing)
        else:
            inc = Incident(
                cluster_id=cluster_id,
                severity=sev,
                status="detected",
                namespace=namespace,
                resource_kind=resource_kind,
                resource_name=resource_name,
                reason=reason,
                message=message,
                timeline=[{"ts": now_iso(), "kind": "detect", "message": message}],
            )
            s.add(inc)
            s.flush()
            payload = serialize(inc)

    broadcast("incident:upsert", payload)
    return payload


def update_incident(incident_id: int, **fields) -> Optional[dict]:
    with session_scope() as s:
        inc = s.get(Incident, incident_id)
        if not inc:
            return None
        for k, v in fields.items():
            if hasattr(inc, k):
                setattr(inc, k, v)
        inc.updated_at = datetime.utcnow()
        s.flush()
        payload = serialize(inc)
    broadcast("incident:upsert", payload)
    return payload


def add_timeline_event(incident_id: int, kind: str, message: str) -> Optional[dict]:
    with session_scope() as s:
        inc = s.get(Incident, incident_id)
        if not inc:
            return None
        append_timeline(inc, kind, message)
        inc.updated_at = datetime.utcnow()
        s.flush()
        payload = serialize(inc)
    broadcast("incident:upsert", payload)
    return payload


def list_incidents(cluster_id: int, limit: int = 100) -> list[dict]:
    with session_scope() as s:
        rows = (
            s.query(Incident)
            .filter_by(cluster_id=cluster_id)
            .order_by(Incident.created_at.desc())
            .limit(limit)
            .all()
        )
        return [serialize(r) for r in rows]
