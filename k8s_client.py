"""Kubernetes client wrapper with a built-in demo / mock mode.

When DEMO_MODE is true (default), the client returns realistic-looking
synthetic data so the dashboard can be demoed without a real cluster.
"""
from __future__ import annotations

import os
import random
import time
from datetime import datetime, timedelta, timezone
from typing import Any

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"


# ---------------------------------------------------------------------------
# Real Kubernetes client (loaded lazily so demo mode has zero hard deps)
# ---------------------------------------------------------------------------
def _load_real_clients():
    from kubernetes import client, config  # type: ignore

    kubeconfig = os.getenv("KUBECONFIG") or None
    try:
        if kubeconfig:
            config.load_kube_config(config_file=kubeconfig)
        else:
            try:
                config.load_incluster_config()
            except Exception:
                config.load_kube_config()
    except Exception as exc:  # pragma: no cover - environment dependent
        raise RuntimeError(f"Unable to load kubeconfig: {exc}") from exc

    return client.CoreV1Api(), client.AppsV1Api()


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------
_DEMO_NAMESPACES = ["default", "kube-system", "production", "staging", "monitoring"]

_DEMO_PODS_TEMPLATE = [
    # name, namespace, status, reason, restarts, image, node
    ("frontend-7d8c9f-abcde", "production", "Running", None, 0, "nginx:1.25", "node-1"),
    ("frontend-7d8c9f-fghij", "production", "Running", None, 1, "nginx:1.25", "node-2"),
    ("api-gateway-66b-x1y2z", "production", "CrashLoopBackOff", "CrashLoopBackOff", 12, "company/api:v2.3.1", "node-1"),
    ("payments-svc-5f-aaaaa", "production", "Running", None, 0, "company/payments:1.4", "node-3"),
    ("payments-svc-5f-bbbbb", "production", "ImagePullBackOff", "ErrImagePull", 0, "company/payments:1.5-rc", "node-2"),
    ("redis-cache-0", "production", "Running", None, 0, "redis:7.2", "node-2"),
    ("postgres-primary-0", "production", "Running", None, 0, "postgres:16", "node-3"),
    ("worker-queue-9d-q1w2e", "staging", "OOMKilled", "OOMKilled", 5, "company/worker:dev", "node-2"),
    ("worker-queue-9d-r3t4y", "staging", "Running", None, 2, "company/worker:dev", "node-1"),
    ("metrics-collector-xyz", "monitoring", "Pending", "Unschedulable", 0, "prom/node-exporter:1.7", "—"),
    ("grafana-7c4-pqrst", "monitoring", "Running", None, 0, "grafana/grafana:10.4", "node-1"),
    ("coredns-76f-uvwxy", "kube-system", "Running", None, 0, "coredns/coredns:1.11", "node-1"),
    ("kube-proxy-mnopq", "kube-system", "Running", None, 0, "k8s.gcr.io/kube-proxy:v1.30", "node-2"),
    ("auth-service-8b-z9y8x", "production", "Running", None, 7, "company/auth:2.0", "node-3"),
    ("notification-svc-d-1a2b", "default", "Error", "Error", 3, "company/notify:0.9", "node-1"),
]


def _demo_pods() -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    pods = []
    for name, ns, phase, reason, restarts, image, node in _DEMO_PODS_TEMPLATE:
        age_min = random.randint(5, 60 * 24 * 7)
        ready = phase == "Running"
        cpu = round(random.uniform(5, 480), 1)
        mem = round(random.uniform(20, 900), 1)
        pods.append(
            {
                "name": name,
                "namespace": ns,
                "phase": phase,
                "reason": reason,
                "ready": ready,
                "restarts": restarts,
                "image": image,
                "node": node,
                "age": _humanize_age(now - timedelta(minutes=age_min)),
                "created_at": (now - timedelta(minutes=age_min)).isoformat(),
                "cpu_millicores": cpu,
                "memory_mib": mem,
                "containers": [
                    {
                        "name": name.split("-")[0],
                        "image": image,
                        "ready": ready,
                        "restart_count": restarts,
                        "state": phase.lower(),
                    }
                ],
                "logs_excerpt": _demo_logs(phase, reason),
            }
        )
    return pods


def _demo_logs(phase: str, reason: str | None) -> str:
    if phase == "CrashLoopBackOff":
        return (
            "panic: runtime error: invalid memory address or nil pointer dereference\n"
            "goroutine 1 [running]:\n"
            "main.connectDB(0x0)\n\t/app/main.go:42 +0x2a\n"
            "main.main()\n\t/app/main.go:18 +0x35\n"
            "exit status 2"
        )
    if reason == "OOMKilled":
        return (
            "INFO  worker started\n"
            "INFO  processing batch size=10000\n"
            "WARN  memory usage 92%\n"
            "FATAL container OOM killed (limit: 256Mi, used: 312Mi)"
        )
    if phase in {"ImagePullBackOff", "ErrImagePull"} or reason == "ErrImagePull":
        return (
            "Failed to pull image \"company/payments:1.5-rc\": "
            "rpc error: code = NotFound desc = manifest for company/payments:1.5-rc not found"
        )
    if phase == "Pending" or reason == "Unschedulable":
        return (
            "0/3 nodes are available: "
            "3 Insufficient cpu, 2 Insufficient memory."
        )
    if phase == "Error":
        return "Error: connection refused to upstream amqp://rabbitmq:5672"
    return "INFO  service healthy\nINFO  request handled in 12ms\nINFO  heartbeat ok"


def _demo_events() -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    samples = [
        ("Warning", "BackOff", "api-gateway-66b-x1y2z", "production", "Back-off restarting failed container"),
        ("Warning", "Failed", "payments-svc-5f-bbbbb", "production", "Failed to pull image \"company/payments:1.5-rc\""),
        ("Warning", "OOMKilling", "worker-queue-9d-q1w2e", "staging", "Container worker exceeded memory limit"),
        ("Warning", "FailedScheduling", "metrics-collector-xyz", "monitoring", "0/3 nodes available: insufficient cpu"),
        ("Normal", "Pulled", "frontend-7d8c9f-abcde", "production", "Successfully pulled image nginx:1.25"),
        ("Normal", "Scheduled", "frontend-7d8c9f-fghij", "production", "Assigned to node-2"),
        ("Warning", "Unhealthy", "auth-service-8b-z9y8x", "production", "Liveness probe failed: HTTP 500"),
    ]
    events = []
    for i, (etype, reason, obj, ns, msg) in enumerate(samples):
        events.append(
            {
                "type": etype,
                "reason": reason,
                "object": obj,
                "namespace": ns,
                "message": msg,
                "timestamp": (now - timedelta(minutes=i * 3 + 1)).isoformat(),
            }
        )
    return events


def _demo_nodes() -> list[dict[str, Any]]:
    return [
        {"name": "node-1", "status": "Ready", "cpu_pct": 62, "mem_pct": 71, "pods": 18},
        {"name": "node-2", "status": "Ready", "cpu_pct": 81, "mem_pct": 88, "pods": 22},
        {"name": "node-3", "status": "Ready", "cpu_pct": 44, "mem_pct": 53, "pods": 14},
    ]


def _humanize_age(start: datetime) -> str:
    delta = datetime.now(timezone.utc) - start
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m"
    if seconds < 86400:
        return f"{seconds // 3600}h"
    return f"{seconds // 86400}d"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
class K8sClient:
    def __init__(self) -> None:
        self.demo = DEMO_MODE
        self._core = None
        self._apps = None
        if not self.demo:
            self._core, self._apps = _load_real_clients()

    # -- pods ---------------------------------------------------------------
    def list_pods(self, namespace: str | None = None) -> list[dict[str, Any]]:
        if self.demo:
            pods = _demo_pods()
            if namespace and namespace != "all":
                pods = [p for p in pods if p["namespace"] == namespace]
            return pods

        if namespace and namespace != "all":
            resp = self._core.list_namespaced_pod(namespace)
        else:
            resp = self._core.list_pod_for_all_namespaces()
        return [self._serialize_pod(p) for p in resp.items]

    def get_pod_logs(self, namespace: str, name: str, tail: int = 100) -> str:
        if self.demo:
            for p in _demo_pods():
                if p["name"] == name:
                    return p["logs_excerpt"]
            return "(no logs)"
        try:
            return self._core.read_namespaced_pod_log(name=name, namespace=namespace, tail_lines=tail)
        except Exception as exc:  # pragma: no cover
            return f"(failed to fetch logs: {exc})"

    def delete_pod(self, namespace: str, name: str) -> dict[str, Any]:
        if self.demo:
            return {"ok": True, "message": f"[demo] Pod {namespace}/{name} restart triggered"}
        self._core.delete_namespaced_pod(name=name, namespace=namespace)
        return {"ok": True, "message": f"Pod {namespace}/{name} deleted (will be recreated by controller)"}

    # -- cluster ------------------------------------------------------------
    def list_namespaces(self) -> list[str]:
        if self.demo:
            return _DEMO_NAMESPACES
        return [n.metadata.name for n in self._core.list_namespace().items]

    def list_nodes(self) -> list[dict[str, Any]]:
        if self.demo:
            return _demo_nodes()
        nodes = []
        for n in self._core.list_node().items:
            cond = {c.type: c.status for c in (n.status.conditions or [])}
            nodes.append(
                {
                    "name": n.metadata.name,
                    "status": "Ready" if cond.get("Ready") == "True" else "NotReady",
                    "cpu_pct": 0,
                    "mem_pct": 0,
                    "pods": 0,
                }
            )
        return nodes

    def list_events(self, limit: int = 25) -> list[dict[str, Any]]:
        if self.demo:
            return _demo_events()[:limit]
        evs = self._core.list_event_for_all_namespaces(limit=limit).items
        out = []
        for e in evs:
            out.append(
                {
                    "type": e.type,
                    "reason": e.reason,
                    "object": getattr(e.involved_object, "name", ""),
                    "namespace": e.metadata.namespace,
                    "message": e.message,
                    "timestamp": (e.last_timestamp or e.event_time or datetime.now(timezone.utc)).isoformat()
                    if hasattr(e, "last_timestamp")
                    else datetime.now(timezone.utc).isoformat(),
                }
            )
        return out

    # -- internal -----------------------------------------------------------
    @staticmethod
    def _serialize_pod(pod) -> dict[str, Any]:
        statuses = pod.status.container_statuses or []
        restarts = sum(s.restart_count for s in statuses)
        ready = all(s.ready for s in statuses) if statuses else False
        reason = None
        for s in statuses:
            if s.state and s.state.waiting and s.state.waiting.reason:
                reason = s.state.waiting.reason
                break
            if s.state and s.state.terminated and s.state.terminated.reason:
                reason = s.state.terminated.reason
                break
        created = pod.metadata.creation_timestamp or datetime.now(timezone.utc)
        return {
            "name": pod.metadata.name,
            "namespace": pod.metadata.namespace,
            "phase": pod.status.phase,
            "reason": reason,
            "ready": ready,
            "restarts": restarts,
            "image": (pod.spec.containers[0].image if pod.spec.containers else ""),
            "node": pod.spec.node_name or "—",
            "age": _humanize_age(created if created.tzinfo else created.replace(tzinfo=timezone.utc)),
            "created_at": created.isoformat(),
            "cpu_millicores": 0,
            "memory_mib": 0,
            "containers": [
                {
                    "name": c.name,
                    "image": c.image,
                    "ready": next((s.ready for s in statuses if s.name == c.name), False),
                    "restart_count": next((s.restart_count for s in statuses if s.name == c.name), 0),
                    "state": "running" if next((s.ready for s in statuses if s.name == c.name), False) else "waiting",
                }
                for c in (pod.spec.containers or [])
            ],
            "logs_excerpt": "",
        }
