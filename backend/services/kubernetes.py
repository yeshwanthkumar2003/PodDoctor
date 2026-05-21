"""Kubernetes client + topology helpers.

Note: file is named `kubernetes.py` per project spec. We only ever do
absolute imports of the third-party kubernetes package (e.g. `from kubernetes
import client, watch`), so there is no name collision.
"""
from kubernetes import client, config as kube_config  # type: ignore

from services.eks import build_kube_config
from utils.logger import get_logger

log = get_logger(__name__)


def build_api_client(access_key: str, secret_key: str, region: str, cluster_name: str) -> client.ApiClient:
    """Build an authenticated kubernetes ApiClient using a freshly-signed EKS token."""
    kc = build_kube_config(access_key, secret_key, region, cluster_name)
    cfg = client.Configuration()
    cfg.host = kc["host"]
    cfg.ssl_ca_cert = kc["ssl_ca_cert"]
    cfg.api_key = {"authorization": f"Bearer {kc['api_key']}"}
    cfg.verify_ssl = True
    return client.ApiClient(configuration=cfg)


def core_v1(api: client.ApiClient) -> client.CoreV1Api:
    return client.CoreV1Api(api_client=api)


def apps_v1(api: client.ApiClient) -> client.AppsV1Api:
    return client.AppsV1Api(api_client=api)


# ---------- Topology -----------------------------------------------------

def list_nodes(api: client.ApiClient) -> list[dict]:
    nodes = core_v1(api).list_node().items
    out = []
    for n in nodes:
        conditions = {c.type: c.status for c in (n.status.conditions or [])}
        health = "healthy"
        if conditions.get("Ready") != "True":
            health = "critical"
        elif conditions.get("MemoryPressure") == "True" or conditions.get("DiskPressure") == "True":
            health = "warning"
        cap = n.status.capacity or {}
        out.append({
            "id": n.metadata.name,
            "name": n.metadata.name,
            "role": _node_role(n),
            "zone": (n.metadata.labels or {}).get("topology.kubernetes.io/zone", "unknown"),
            "health": health,
            "capacity": {"cpu": cap.get("cpu"), "memory": cap.get("memory"), "pods": cap.get("pods")},
            "createdAt": n.metadata.creation_timestamp.isoformat() if n.metadata.creation_timestamp else None,
        })
    return out


def _node_role(node) -> str:
    labels = node.metadata.labels or {}
    if "node-role.kubernetes.io/control-plane" in labels or "node-role.kubernetes.io/master" in labels:
        return "control-plane"
    if "nvidia.com/gpu" in (node.status.capacity or {}):
        return "gpu"
    return "worker"


def list_pods(api: client.ApiClient, namespace: str | None = None) -> list[dict]:
    v1 = core_v1(api)
    pods = (v1.list_pod_for_all_namespaces() if not namespace
            else v1.list_namespaced_pod(namespace=namespace)).items
    out = []
    for p in pods:
        cs = p.status.container_statuses or []
        restarts = sum(c.restart_count for c in cs)
        reason = _pod_reason(p)
        out.append({
            "id": f"{p.metadata.namespace}/{p.metadata.name}",
            "name": p.metadata.name,
            "namespace": p.metadata.namespace,
            "nodeId": p.spec.node_name,
            "phase": p.status.phase,
            "reason": reason,
            "health": _pod_health(p, reason),
            "restarts": restarts,
            "image": cs[0].image if cs else None,
        })
    return out


def _pod_reason(pod) -> str | None:
    for c in pod.status.container_statuses or []:
        if c.state.waiting and c.state.waiting.reason:
            return c.state.waiting.reason
        if c.state.terminated and c.state.terminated.reason:
            return c.state.terminated.reason
    return None


def _pod_health(pod, reason: str | None) -> str:
    bad = {"CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull", "OOMKilled", "CreateContainerConfigError"}
    warn = {"ContainerCreating", "PodInitializing", "Pending"}
    if reason in bad:
        return "critical"
    if pod.status.phase in ("Failed",):
        return "critical"
    if reason in warn or pod.status.phase == "Pending":
        return "warning"
    return "healthy"


def list_deployments(api: client.ApiClient) -> list[dict]:
    deps = apps_v1(api).list_deployment_for_all_namespaces().items
    return [
        {
            "name": d.metadata.name,
            "namespace": d.metadata.namespace,
            "replicas": d.status.replicas or 0,
            "available": d.status.available_replicas or 0,
            "ready": d.status.ready_replicas or 0,
            "updated": d.status.updated_replicas or 0,
        }
        for d in deps
    ]


def list_events(api: client.ApiClient, limit: int = 100) -> list[dict]:
    evs = core_v1(api).list_event_for_all_namespaces(limit=limit).items
    return [
        {
            "namespace": e.metadata.namespace,
            "type": e.type,
            "reason": e.reason,
            "message": e.message,
            "object": f"{(e.involved_object.kind or '').lower()}/{e.involved_object.name}",
            "ts": (e.last_timestamp or e.event_time or e.metadata.creation_timestamp).isoformat()
                  if (e.last_timestamp or e.event_time or e.metadata.creation_timestamp) else None,
        }
        for e in evs
    ]


def pod_logs(api: client.ApiClient, namespace: str, name: str, tail: int = 200) -> str:
    try:
        return core_v1(api).read_namespaced_pod_log(
            name=name, namespace=namespace, tail_lines=tail
        )
    except client.ApiException as e:
        log.warning("pod_logs failed: %s", e)
        return ""
