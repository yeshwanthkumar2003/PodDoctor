"""Metrics endpoints — backed by Prometheus."""
from flask import Blueprint, jsonify, request

from services.metrics import cluster_overview, history

metrics_bp = Blueprint("metrics", __name__)


@metrics_bp.get("")
def get_metrics():
    return jsonify(overview=cluster_overview())


@metrics_bp.get("/range")
def get_range():
    q = request.args.get("query")
    minutes = request.args.get("minutes", default=30, type=int)
    if not q:
        return jsonify(error="query required"), 400
    return jsonify(series=history(q, minutes=minutes))
