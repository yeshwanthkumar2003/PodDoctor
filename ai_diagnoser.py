"""AI diagnosis engine.

Uses a rule-based knowledge base for instant, deterministic diagnosis of common
Kubernetes failure modes. If an OpenAI-compatible API key is configured, the
LLM is consulted to enrich the explanation with a natural-language summary.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from typing import Any

import requests


SEVERITY_ORDER = {"critical": 3, "high": 2, "medium": 1, "low": 0, "info": 0}


@dataclass
class Diagnosis:
    pod: str
    namespace: str
    severity: str               # critical | high | medium | low | info
    issue: str                  # short label
    root_cause: str             # human explanation
    evidence: list[str]         # signals that led to the diagnosis
    suggested_actions: list[str]
    auto_heal: str | None       # action key the healer can run, or None
    confidence: float           # 0..1
    ai_summary: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Rule-based diagnosis
# ---------------------------------------------------------------------------
def _rule_based(pod: dict[str, Any]) -> Diagnosis:
    name = pod["name"]
    ns = pod["namespace"]
    phase = pod.get("phase") or ""
    reason = (pod.get("reason") or "").lower()
    restarts = pod.get("restarts", 0)
    logs = (pod.get("logs_excerpt") or "").lower()

    # CrashLoopBackOff -------------------------------------------------------
    if phase == "CrashLoopBackOff" or "crashloop" in reason:
        evidence = [f"Pod phase = {phase}", f"Restart count = {restarts}"]
        if "panic" in logs or "nil pointer" in logs:
            evidence.append("Logs contain Go panic / nil pointer dereference")
            cause = (
                "The container is panicking on startup, most likely due to a nil "
                "pointer dereference while initializing dependencies (e.g. database "
                "connection returning nil)."
            )
            actions = [
                "Inspect the most recent code change touching startup / DB init.",
                "Verify required env vars (DB_HOST, DB_USER) are set in the Pod spec.",
                "Add a readiness probe so traffic isn't sent before init completes.",
            ]
        else:
            cause = (
                "The container starts and exits repeatedly. Kubernetes is backing "
                "off between restarts."
            )
            actions = [
                "Run `kubectl logs --previous` to inspect the last crash.",
                "Validate the container command, args and required environment variables.",
                "Check liveness probe — an aggressive probe can kill a healthy pod.",
            ]
        return Diagnosis(
            pod=name, namespace=ns, severity="critical",
            issue="CrashLoopBackOff",
            root_cause=cause, evidence=evidence,
            suggested_actions=actions,
            auto_heal="restart_pod", confidence=0.9,
        )

    # ImagePullBackOff -------------------------------------------------------
    if phase in {"ImagePullBackOff", "ErrImagePull"} or "errimagepull" in reason or "imagepull" in reason:
        return Diagnosis(
            pod=name, namespace=ns, severity="high",
            issue="ImagePullBackOff",
            root_cause=(
                "Kubelet cannot pull the container image. The tag may not exist "
                "in the registry, or the cluster lacks credentials for a private repo."
            ),
            evidence=[f"Phase = {phase}", f"Image = {pod.get('image')}", "Logs report manifest not found" if "not found" in logs else "Image pull failure reported by kubelet"],
            suggested_actions=[
                "Verify the image tag exists: `docker pull <image>` locally.",
                "If the registry is private, attach an `imagePullSecret` to the Pod's ServiceAccount.",
                "Roll back to the last known-good image tag.",
            ],
            auto_heal=None, confidence=0.95,
        )

    # OOMKilled --------------------------------------------------------------
    if "oomkilled" in reason or "oom" in logs:
        return Diagnosis(
            pod=name, namespace=ns, severity="high",
            issue="OOMKilled",
            root_cause=(
                "The container exceeded its memory limit and was killed by the "
                "kernel OOM reaper. Either the workload needs more memory or it "
                "has a memory leak."
            ),
            evidence=["Reason = OOMKilled", "Logs show memory usage spiking before kill"],
            suggested_actions=[
                "Increase `resources.limits.memory` (e.g. 256Mi → 512Mi).",
                "Profile the workload to identify leaks (heap dump / pprof).",
                "Add an HPA or split the batch size to reduce per-pod memory.",
            ],
            auto_heal="restart_pod", confidence=0.9,
        )

    # Pending / Unschedulable ------------------------------------------------
    if phase == "Pending" or "unschedulable" in reason or "insufficient" in logs:
        return Diagnosis(
            pod=name, namespace=ns, severity="medium",
            issue="Unschedulable",
            root_cause=(
                "The scheduler cannot place this pod on any node. Common causes: "
                "insufficient CPU/memory, taints without matching tolerations, or "
                "node selectors that match no node."
            ),
            evidence=["Phase = Pending", "Scheduler reports insufficient resources"],
            suggested_actions=[
                "Run `kubectl describe pod` to read the scheduler events.",
                "Scale the node pool or reduce the pod's resource requests.",
                "Check nodeSelector / affinity rules and node taints.",
            ],
            auto_heal=None, confidence=0.85,
        )

    # Error / generic failure ------------------------------------------------
    if phase == "Error" or "error" in reason:
        return Diagnosis(
            pod=name, namespace=ns, severity="high",
            issue="Container Error",
            root_cause=(
                "The container exited with a non-zero status. Logs suggest an "
                "unreachable upstream dependency."
            ),
            evidence=[f"Phase = {phase}", "Logs show 'connection refused'" if "connection refused" in logs else "Non-zero exit"],
            suggested_actions=[
                "Verify the upstream Service is running and DNS resolves.",
                "Add a retry/backoff to the client.",
                "Check NetworkPolicies blocking egress.",
            ],
            auto_heal="restart_pod", confidence=0.7,
        )

    # High restart count, otherwise running ---------------------------------
    if restarts >= 5 and phase == "Running":
        return Diagnosis(
            pod=name, namespace=ns, severity="medium",
            issue="Flapping (high restart count)",
            root_cause=(
                f"The pod is currently Running but has restarted {restarts} times. "
                "Liveness probe or intermittent crashes are recycling the container."
            ),
            evidence=[f"Restart count = {restarts}"],
            suggested_actions=[
                "Review liveness probe thresholds (initialDelaySeconds, failureThreshold).",
                "Inspect recent crash logs with `kubectl logs --previous`.",
            ],
            auto_heal=None, confidence=0.75,
        )

    # Healthy ----------------------------------------------------------------
    return Diagnosis(
        pod=name, namespace=ns, severity="info",
        issue="Healthy",
        root_cause="No anomalies detected. Pod is Ready and serving traffic.",
        evidence=[f"Phase = {phase}", f"Restarts = {restarts}"],
        suggested_actions=[],
        auto_heal=None, confidence=0.99,
    )


# ---------------------------------------------------------------------------
# Optional LLM enrichment
# ---------------------------------------------------------------------------
def _llm_enrich(pod: dict[str, Any], diagnosis: Diagnosis) -> str | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    prompt = (
        "You are an SRE assistant. In 2-3 sentences, give a friendly natural-language "
        "summary an on-call engineer can read at a glance.\n\n"
        f"Pod: {pod['namespace']}/{pod['name']}\n"
        f"Detected issue: {diagnosis.issue}\n"
        f"Root cause: {diagnosis.root_cause}\n"
        f"Evidence: {', '.join(diagnosis.evidence)}\n"
        f"Logs:\n{(pod.get('logs_excerpt') or '')[:800]}"
    )
    try:
        resp = requests.post(
            f"{base}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            data=json.dumps(
                {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a concise Kubernetes SRE assistant."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                    "max_tokens": 200,
                }
            ),
            timeout=15,
        )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def diagnose(pod: dict[str, Any]) -> dict[str, Any]:
    d = _rule_based(pod)
    d.ai_summary = _llm_enrich(pod, d)
    return d.to_dict()


def diagnose_all(pods: list[dict[str, Any]]) -> list[dict[str, Any]]:
    issues = []
    for p in pods:
        d = _rule_based(p)
        if d.severity != "info":
            issues.append(d.to_dict())
    issues.sort(key=lambda x: SEVERITY_ORDER.get(x["severity"], 0), reverse=True)
    return issues
