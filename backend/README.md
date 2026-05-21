# PodDoctor — Backend

Simple, functional Flask backend that turns AWS EKS into an AI-monitored,
auto-remediating cluster.

## Quick start

```bash
cp backend/.env.example backend/.env
docker compose up -d
```

Then:

- Frontend → http://localhost:5173
- API      → http://localhost:8000
- Prometheus → http://localhost:9090

## Onboarding flow

1. `POST /auth/aws/connect` — submit AWS access key/secret/region + Groq key.
2. `GET  /eks/clusters` — discover EKS clusters in that region.
3. `POST /eks/select` — choose a cluster (watchers start automatically).
4. `GET  /topology?cluster_id=…` — nodes, pods, deployments.
5. `GET  /incidents?cluster_id=…` — incident feed.
6. `POST /remediation/execute` — restart deployment, delete pod, scale, rollout.
7. WebSocket on the same origin streams `incident:upsert`, `metrics:tick`,
   `remediation:done`, `k8s:event`.

## Layout

```
backend/
├── app.py              # Flask + SocketIO entrypoint
├── config.py           # env loader
├── routes/             # HTTP blueprints
├── services/           # functional service modules (no classes)
├── tasks/              # Celery tasks (watchers, polling, remediation)
├── sockets/events.py   # Flask-SocketIO event handlers
├── database/           # SQLAlchemy engine + models
└── utils/              # logger, security, helpers
```

## Notes

- Credentials are stored Fernet-encrypted in PostgreSQL.
- All long-running work runs in Celery workers; the Flask process only serves
  HTTP + WebSocket.
- Cross-process broadcasts use the Redis message queue, so watchers running in
  Celery can `emit()` directly to connected websocket clients.
- Remediation has an allow-list — namespace/PVC deletion + node termination
  are hard-blocked.
