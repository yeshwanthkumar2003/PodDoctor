"""PodDoctor — AI-powered Kubernetes auto-healer dashboard."""
from __future__ import annotations

import os
from collections import Counter

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

load_dotenv()

from k8s_client import K8sClient  # noqa: E402
from ai_diagnoser import diagnose, diagnose_all  # noqa: E402
from healer import run_action  # noqa: E402

app = Flask(__name__)
client = K8sClient()


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html", demo_mode=client.demo)


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
@app.get("/api/cluster/overview")
def overview():
    pods = client.list_pods()
    nodes = client.list_nodes()
    issues = diagnose_all(pods)

    phases = Counter(p["phase"] for p in pods)
    sev = Counter(i["severity"] for i in issues)

    return jsonify(
        {
            "demo_mode": client.demo,
            "totals": {
                "pods": len(pods),
                "healthy": sum(1 for p in pods if p["ready"] and p["phase"] == "Running"),
                "issues": len(issues),
                "nodes": len(nodes),
                "namespaces": len(client.list_namespaces()),
            },
            "phase_breakdown": phases,
            "severity_breakdown": sev,
            "nodes": nodes,
            "namespaces": client.list_namespaces(),
        }
    )


@app.get("/api/pods")
def list_pods():
    ns = request.args.get("namespace", "all")
    return jsonify(client.list_pods(namespace=ns))


@app.get("/api/issues")
def list_issues():
    pods = client.list_pods()
    return jsonify(diagnose_all(pods))


@app.get("/api/pods/<namespace>/<name>/diagnose")
def diagnose_pod(namespace: str, name: str):
    pods = [p for p in client.list_pods(namespace) if p["name"] == name]
    if not pods:
        return jsonify({"error": "pod not found"}), 404
    pod = pods[0]
    pod["logs_excerpt"] = client.get_pod_logs(namespace, name)
    return jsonify(diagnose(pod))


@app.get("/api/pods/<namespace>/<name>/logs")
def pod_logs(namespace: str, name: str):
    return jsonify({"logs": client.get_pod_logs(namespace, name)})


@app.post("/api/pods/<namespace>/<name>/heal")
def heal_pod(namespace: str, name: str):
    body = request.get_json(silent=True) or {}
    action = body.get("action", "restart_pod")
    return jsonify(run_action(client, action, namespace, name))


@app.get("/api/events")
def events():
    return jsonify(client.list_events(limit=30))


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_HOST", "0.0.0.0"),
        port=int(os.getenv("FLASK_PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "true").lower() == "true",
    )
