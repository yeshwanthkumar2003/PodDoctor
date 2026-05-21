"""Misc helpers."""
from datetime import datetime
from typing import Any


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def serialize(obj: Any) -> Any:
    """Best-effort SQLAlchemy model -> dict."""
    if obj is None:
        return None
    if hasattr(obj, "__table__"):
        out = {}
        for col in obj.__table__.columns:
            v = getattr(obj, col.name)
            if isinstance(v, datetime):
                v = v.isoformat() + "Z"
            out[col.name] = v
        return out
    if isinstance(obj, list):
        return [serialize(x) for x in obj]
    return obj


def safe_get(d: dict, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur
