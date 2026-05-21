"""Prometheus metric helpers."""
from typing import Optional

from prometheus_api_client import PrometheusConnect

from config import config
from utils.logger import get_logger

log = get_logger(__name__)


def _client(url: Optional[str] = None) -> PrometheusConnect:
    return PrometheusConnect(url=url or config.PROMETHEUS_URL, disable_ssl=True)


def cluster_overview(url: Optional[str] = None) -> dict:
    """Return high-level cluster numbers used by the dashboard tiles."""
    pc = _client(url)
    out = {"cpu": None, "memory": None, "pods": None, "nodes_ready": None}
    try:
        out["cpu"] = _scalar(pc, "1 - avg(rate(node_cpu_seconds_total{mode=\"idle\"}[1m]))")
        out["memory"] = _scalar(
            pc,
            "1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)",
        )
        out["pods"] = _scalar(pc, "sum(kube_pod_info)")
        out["nodes_ready"] = _scalar(
            pc, "sum(kube_node_status_condition{condition=\"Ready\",status=\"true\"})"
        )
    except Exception as e:
        log.warning("prometheus overview failed: %s", e)
    return out


def _scalar(pc: PrometheusConnect, q: str) -> float | None:
    try:
        res = pc.custom_query(query=q)
        if not res:
            return None
        return float(res[0]["value"][1])
    except Exception:
        return None


def history(query: str, minutes: int = 30, url: Optional[str] = None) -> list[tuple[float, float]]:
    """Run a range query — returns [(ts, value)]."""
    import time
    end = time.time()
    start = end - minutes * 60
    pc = _client(url)
    try:
        data = pc.custom_query_range(query=query, start_time=start, end_time=end, step=30)
        if not data:
            return []
        return [(float(t), float(v)) for t, v in data[0].get("values", [])]
    except Exception as e:
        log.warning("prometheus range query failed: %s", e)
        return []
