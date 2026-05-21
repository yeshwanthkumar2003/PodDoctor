"""Groq AI helpers — analyze incidents, suggest remediation."""
import json
import os
from typing import Optional

from groq import Groq

from config import config
from utils.logger import get_logger

log = get_logger(__name__)


def _client(api_key: Optional[str] = None) -> Groq:
    key = api_key or os.getenv("GROQ_API_KEY", "")
    if not key:
        raise RuntimeError("GROQ API key missing")
    return Groq(api_key=key)


SYS_PROMPT = """You are PodDoctor, an SRE assistant for Kubernetes on AWS EKS.
You receive Kubernetes incident context (events, pod state, recent logs).
Return STRICT JSON with this exact shape and nothing else:
{
  "root_cause": "<one sentence>",
  "confidence": 0.0,
  "suggested_fix": "<one or two short sentences>",
  "action": "restart_deployment|delete_pod|rollout_restart|scale_deployment|none",
  "summary": "<short human-readable explanation>"
}
Confidence is between 0 and 1. Keep it concise. Do not include backticks."""


def analyze_incident(
    *,
    reason: str | None,
    namespace: str | None,
    resource_name: str | None,
    message: str | None,
    logs: str = "",
    api_key: Optional[str] = None,
) -> dict:
    """Run Groq analysis. Returns dict matching SYS_PROMPT shape."""
    try:
        ctx = {
            "reason": reason,
            "namespace": namespace,
            "resource": resource_name,
            "event_message": message,
            "recent_logs": logs[-4000:] if logs else "",
        }
        resp = _client(api_key).chat.completions.create(
            model=config.GROQ_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYS_PROMPT},
                {"role": "user", "content": json.dumps(ctx)},
            ],
            temperature=0.2,
            max_tokens=400,
        )
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
        return {
            "root_cause": data.get("root_cause", ""),
            "confidence": float(data.get("confidence", 0.5)),
            "suggested_fix": data.get("suggested_fix", ""),
            "action": data.get("action", "none"),
            "summary": data.get("summary", ""),
        }
    except Exception as e:
        log.exception("AI analysis failed: %s", e)
        return {
            "root_cause": "Unable to analyze automatically",
            "confidence": 0.0,
            "suggested_fix": "Inspect the pod manually with kubectl describe/logs.",
            "action": "none",
            "summary": str(e),
        }
