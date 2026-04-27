# PodDoctor 🩺

> **AI-powered Kubernetes auto-healer dashboard** — find, explain, and fix cluster issues from a beautiful single-page UI.

PodDoctor is a Flask web app that watches your Kubernetes cluster, uses an AI/rule-based engine to **pinpoint exactly where and why** things are failing, and lets you trigger one-click auto-heal actions.

![stack](https://img.shields.io/badge/stack-Flask%20%2B%20Vanilla%20JS-6366f1)
![mode](https://img.shields.io/badge/mode-Demo%20%7C%20Live-10b981)

---

## ✨ Features

- 🧠 **AI diagnosis engine** — explains root cause, evidence, and remediation steps for `CrashLoopBackOff`, `ImagePullBackOff`, `OOMKilled`, `Pending/Unschedulable`, flapping pods, and more.
- ⚡ **One-click auto-heal** — restart pods or run remediation actions directly from the UI.
- 📊 **Stunning dashboard** — glassmorphism cards, animated background orbs, severity-coded issue feed, live KPIs, node pressure bars, and a real-time event stream.
- 🔌 **LLM enrichment (optional)** — set an `OPENAI_API_KEY` and every diagnosis gets a friendly natural-language summary from GPT.
- 🧪 **Demo mode** — runs out-of-the-box with rich synthetic cluster data, no `kubectl` required.
- 🔄 **Auto-refresh** every 15s + manual refresh button.

---

## 🚀 Quick start

```bash
git clone <your-fork>
cd PodDoctor

python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # demo mode is enabled by default
python app.py
```

Open **http://localhost:5000** 🎉

---

## 🔌 Connecting to a real cluster

1. Edit [.env](.env) and set:
   ```bash
   DEMO_MODE=false
   KUBECONFIG=/path/to/your/kubeconfig   # or leave empty to use in-cluster config
   ```
2. Restart `python app.py`. The dashboard now reads pods, events, and nodes from your live cluster.

> When deployed **inside** a cluster, give the Pod a ServiceAccount with `get/list/watch/delete` on `pods`, `events`, `nodes`, and `namespaces`.

---

## 🤖 Optional: LLM-powered explanations

Add an OpenAI-compatible endpoint to get a natural-language summary on every diagnosis:

```bash
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1   # or any compatible endpoint
OPENAI_MODEL=gpt-4o-mini
```

Works with OpenAI, Azure OpenAI, Ollama (`http://localhost:11434/v1`), Groq, OpenRouter, and others.

---

## 🗂️ Project layout

```
PodDoctor/
├── app.py              # Flask routes
├── k8s_client.py       # Real + demo Kubernetes client
├── ai_diagnoser.py     # Rule-based + LLM diagnosis engine
├── healer.py           # Auto-heal action runner
├── requirements.txt
├── templates/
│   └── index.html      # Dashboard UI
└── static/
    ├── css/style.css   # Modern dark theme
    └── js/app.js       # Frontend logic
```

---

## 🧠 How the AI diagnosis works

For every pod, the engine collects: phase, reason, restart count, container statuses, and a log excerpt. It then matches against a knowledge base of common failure patterns to produce a structured `Diagnosis`:

```json
{
  "pod": "api-gateway-66b-x1y2z",
  "namespace": "production",
  "severity": "critical",
  "issue": "CrashLoopBackOff",
  "root_cause": "Container is panicking on startup, most likely due to a nil pointer dereference…",
  "evidence": ["Pod phase = CrashLoopBackOff", "Restart count = 12", "Logs contain Go panic"],
  "suggested_actions": ["Inspect recent code change…", "Verify env vars…"],
  "auto_heal": "restart_pod",
  "confidence": 0.9,
  "ai_summary": "The api-gateway pod is repeatedly crashing on boot…"
}
```

The UI ranks issues by severity, explains *exactly* where the failure is, and offers a one-click heal button when a safe automated action is available.

---

## 📜 API reference

| Method | Endpoint                                           | Description                  |
|-------:|----------------------------------------------------|------------------------------|
| GET    | `/api/cluster/overview`                            | KPIs, nodes, namespaces      |
| GET    | `/api/pods?namespace=all`                          | All pods (optionally scoped) |
| GET    | `/api/issues`                                      | Pre-diagnosed issue feed     |
| GET    | `/api/pods/<ns>/<name>/diagnose`                   | Full AI diagnosis            |
| GET    | `/api/pods/<ns>/<name>/logs`                       | Recent container logs        |
| POST   | `/api/pods/<ns>/<name>/heal`  body `{action}`      | Run heal action              |
| GET    | `/api/events`                                      | Cluster event stream         |

---

## 🛠️ Roadmap ideas

- HPA / Deployment scaling actions
- Slack/PagerDuty notifications on new critical issues
- Persisted incident history + post-mortem export
- Multi-cluster support
- Authentication (OIDC / GitHub)

PRs welcome 💜
