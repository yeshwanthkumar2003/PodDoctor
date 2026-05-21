"""Topology endpoints — nodes, pods, deployments, links."""
from flask import Blueprint, jsonify, request

from database.db import session_scope
from database.models import Cluster
from services.eks import get_credentials_for_user
from services.kubernetes import (
    build_api_client,
    list_deployments,
    list_events,
    list_nodes,
    list_pods,
)

topology_bp = Blueprint("topology", __name__)


def _api_for(cluster_id: int):
    with session_scope() as s:
        cluster = s.get(Cluster, int(cluster_id))
        if not cluster:
            return None, None
        creds = get_credentials_for_user(cluster.user)
        if not creds:
            return None, cluster
        api = build_api_client(*creds, cluster.name)
        return api, cluster


@topology_bp.get("")
def get_topology():
    cluster_id = request.args.get("cluster_id", type=int)
    if not cluster_id:
        return jsonify(error="cluster_id required"), 400
    api, cluster = _api_for(cluster_id)
    if not api:
        return jsonify(error="cluster or credentials unavailable"), 400

    nodes = list_nodes(api)
    pods = list_pods(api)
    deployments = list_deployments(api)

    # synthesize simple service links: every pod connects to its node
    links = [{"id": f"{p['nodeId']}->{p['id']}",
              "fromNodeId": p["nodeId"],
              "toNodeId": p["id"],
              "protocol": "tcp"}
             for p in pods if p.get("nodeId")]

    return jsonify(
        cluster={"id": cluster.id, "name": cluster.name, "region": cluster.region},
        nodes=nodes,
        pods=pods,
        deployments=deployments,
        links=links,
    )


@topology_bp.get("/events")
def get_events():
    cluster_id = request.args.get("cluster_id", type=int)
    api, _ = _api_for(cluster_id)
    if not api:
        return jsonify(error="cluster unavailable"), 400
    return jsonify(events=list_events(api))
