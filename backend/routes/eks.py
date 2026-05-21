"""EKS cluster discovery + selection."""
from flask import Blueprint, jsonify, request

from database.db import session_scope
from database.models import Cluster, User
from services.eks import get_credentials_for_user, list_clusters
from tasks.watchers import start_cluster_watch
from utils.helpers import serialize

eks_bp = Blueprint("eks", __name__)


def _user_or_404(s, email: str) -> User | None:
    return s.query(User).filter_by(email=email).one_or_none()


@eks_bp.get("/clusters")
def get_clusters():
    """Discover all EKS clusters in the user's region."""
    email = (request.args.get("email") or "").strip().lower()
    with session_scope() as s:
        user = _user_or_404(s, email)
        if not user:
            return jsonify(error="user not found"), 404
        creds = get_credentials_for_user(user)
    if not creds:
        return jsonify(error="aws credentials missing"), 400

    discovered = list_clusters(*creds)

    # upsert into DB
    with session_scope() as s:
        user = _user_or_404(s, email)
        for c in discovered:
            row = (
                s.query(Cluster)
                .filter_by(user_id=user.id, name=c["name"], region=c["region"])
                .one_or_none()
            )
            if not row:
                row = Cluster(user_id=user.id, name=c["name"], region=c["region"])
                s.add(row)
            row.arn = c.get("arn")
            row.endpoint = c.get("endpoint")
            row.version = c.get("version")
            row.status = (c.get("status") or "ACTIVE").lower()
        s.flush()
        rows = s.query(Cluster).filter_by(user_id=user.id).all()
        out = [serialize(r) for r in rows]

    return jsonify(clusters=out)


@eks_bp.post("/select")
def select_cluster():
    """Mark a cluster selected + kick off watchers."""
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    cluster_id = data.get("cluster_id")
    if not (email and cluster_id):
        return jsonify(error="email + cluster_id required"), 400

    with session_scope() as s:
        user = _user_or_404(s, email)
        if not user:
            return jsonify(error="user not found"), 404
        # toggle selection
        for c in user.clusters:
            c.selected = c.id == int(cluster_id)
            if c.selected:
                c.status = "active"
        s.flush()
        selected = next((c for c in user.clusters if c.selected), None)
        payload = serialize(selected) if selected else None

    # fire off Celery watcher
    if selected:
        start_cluster_watch.delay(selected.id)

    return jsonify(cluster=payload)
