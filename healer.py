"""Auto-heal action runner."""
from __future__ import annotations

from typing import Any

from k8s_client import K8sClient


def run_action(client: K8sClient, action: str, namespace: str, pod: str) -> dict[str, Any]:
    if action == "restart_pod":
        return client.delete_pod(namespace, pod)
    return {"ok": False, "message": f"Unknown action: {action}"}
