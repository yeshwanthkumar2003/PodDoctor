"""Incident endpoints."""
from flask import Blueprint, jsonify, request

from database.db import session_scope
from database.models import Incident
from services.incidents import list_incidents, update_incident
from utils.helpers import serialize

incidents_bp = Blueprint("incidents", __name__)


@incidents_bp.get("")
def get_incidents():
    cluster_id = request.args.get("cluster_id", type=int)
    if not cluster_id:
        return jsonify(error="cluster_id required"), 400
    return jsonify(incidents=list_incidents(cluster_id))


@incidents_bp.get("/<int:incident_id>")
def get_incident(incident_id: int):
    with session_scope() as s:
        inc = s.get(Incident, incident_id)
        if not inc:
            return jsonify(error="not found"), 404
        return jsonify(incident=serialize(inc))


@incidents_bp.patch("/<int:incident_id>")
def patch_incident(incident_id: int):
    data = request.get_json(force=True) or {}
    allowed = {"status", "severity", "root_cause", "confidence", "suggested_fix"}
    updates = {k: v for k, v in data.items() if k in allowed}
    res = update_incident(incident_id, **updates)
    if not res:
        return jsonify(error="not found"), 404
    return jsonify(incident=res)
