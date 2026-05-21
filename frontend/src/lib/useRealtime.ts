import { useEffect } from "react";
import { socket, SocketEvents } from "./socket";
import { useTopologyStore } from "../store/useTopologyStore";
import { useMetricsStore } from "../store/useMetricsStore";
import { useIncidentsStore } from "../store/useIncidentsStore";
import { useAIStore } from "../store/useAIStore";
import { clamp, pick, rand, uid } from "./utils";
import type { Incident } from "../types";

/**
 * Mock realtime driver. Periodically fires events on the mock socket and
 * keeps stores in sync — gives the UI a "live" feel without a backend.
 */
export function useRealtime() {
  useEffect(() => {
    // ----- Metrics tick (every 1.5s) -----
    const metricsInterval = setInterval(() => {
      const m = useMetricsStore.getState().metrics;
      const drift = (v: number, d = 0.04) => clamp(v + (Math.random() - 0.5) * d);
      socket.emit(SocketEvents.MetricsTick, {
        health: drift(m.health, 0.02),
        cpu: drift(m.cpu),
        memory: drift(m.memory),
        activePods: m.activePods + (Math.random() < 0.4 ? (Math.random() < 0.5 ? 1 : -1) : 0),
      });
    }, 1500);

    // ----- Node CPU/mem pulse (every 800ms) -----
    const nodeInterval = setInterval(() => {
      const { nodes, updateNodeMetrics } = useTopologyStore.getState();
      nodes.forEach((n) => {
        updateNodeMetrics(n.id, {
          cpu: clamp(n.metrics.cpu + (Math.random() - 0.5) * 0.08),
          memory: clamp(n.metrics.memory + (Math.random() - 0.5) * 0.05),
          network: clamp(n.metrics.network + (Math.random() - 0.5) * 0.1),
        });
      });
    }, 800);

    // ----- Random incident every ~22s -----
    const incidentInterval = setInterval(() => {
      const { pods, setPodHealth, setNodeHealth, nodes } = useTopologyStore.getState();
      const targetPod = pick(pods.filter((p) => p.health === "healthy"));
      if (!targetPod) return;
      setPodHealth(targetPod.id, "critical");
      const node = nodes.find((n) => n.id === targetPod.nodeId);
      if (node) setNodeHealth(node.id, "warning");

      const reasons = [
        {
          title: `CrashLoopBackOff · ${targetPod.namespace}`,
          rc: "Container exited with code 137 (OOMKilled). Memory limit exceeded during burst traffic.",
          fix: "Increase memory request to 768Mi and enable HPA on memory utilization at 75%.",
        },
        {
          title: `ImagePullBackOff · ${targetPod.namespace}`,
          rc: "Registry returned 403 for image — credentials secret rotated 4h ago and not refreshed.",
          fix: "Patch imagePullSecrets with rotated credential and re-create pod.",
        },
        {
          title: `Readiness probe failing · ${targetPod.namespace}`,
          rc: "Upstream Redis dependency latency > 1.2s causing /healthz timeouts.",
          fix: "Switch to fallback Redis replica and increase probe timeout to 3s.",
        },
        {
          title: `CPU throttling · ${targetPod.namespace}`,
          rc: "CPU limits too tight — throttled 84% of time over last 5m.",
          fix: "Raise CPU limit to 1500m and apply VPA recommendations.",
        },
      ];
      const reason = pick(reasons);

      const incident: Incident = {
        id: uid("inc"),
        podId: targetPod.id,
        nodeId: targetPod.nodeId,
        title: reason.title,
        severity: Math.random() < 0.6 ? "critical" : "warning",
        status: "analyzing",
        createdAt: Date.now(),
        rootCause: reason.rc,
        confidence: rand(0.74, 0.97),
        remediation: reason.fix,
        progress: 0.0,
        timeline: [
          { id: uid("t"), ts: Date.now(), kind: "detect", message: `Detected anomaly in pod ${targetPod.name}` },
        ],
      };
      useIncidentsStore.getState().addIncident(incident);
      useAIStore.getState().setAnalyzing(true);
      socket.emit(SocketEvents.IncidentCreated, incident);

      // analysis after a beat
      setTimeout(() => {
        useIncidentsStore.getState().appendTimeline(incident.id, {
          kind: "analyze",
          message: "AI correlating logs, metrics, and events across 14 sources…",
        });
      }, 1400);

      setTimeout(() => {
        useIncidentsStore.getState().appendTimeline(incident.id, {
          kind: "analyze",
          message: `Root cause identified · confidence ${Math.round((incident.confidence ?? 0) * 100)}%`,
        });
        useIncidentsStore.getState().updateIncident(incident.id, { status: "remediating", progress: 0.18 });
      }, 3200);

      setTimeout(() => {
        useIncidentsStore.getState().appendTimeline(incident.id, {
          kind: "action",
          message: "Applying remediation plan via GitOps patch…",
        });
        useIncidentsStore.getState().updateIncident(incident.id, { progress: 0.55 });
        useTopologyStore.getState().setPodHealth(targetPod.id, "recovering");
      }, 5200);

      setTimeout(() => {
        useIncidentsStore.getState().appendTimeline(incident.id, {
          kind: "verify",
          message: "Verifying liveness/readiness across 3/3 replicas",
        });
        useIncidentsStore.getState().updateIncident(incident.id, { progress: 0.85 });
      }, 7200);

      setTimeout(() => {
        useIncidentsStore.getState().appendTimeline(incident.id, {
          kind: "resolve",
          message: "Incident auto-resolved · SLO restored",
        });
        useIncidentsStore.getState().updateIncident(incident.id, { status: "resolved", progress: 1 });
        useTopologyStore.getState().setPodHealth(targetPod.id, "healthy");
        if (node) useTopologyStore.getState().setNodeHealth(node.id, "healthy");
        useAIStore.getState().setAnalyzing(false);
        const m = useMetricsStore.getState().metrics;
        useMetricsStore.getState().tick({ aiActions: m.aiActions + 1 });
      }, 9500);
    }, 22000);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(nodeInterval);
      clearInterval(incidentInterval);
    };
  }, []);

  // wire socket → stores
  useEffect(() => {
    const onTick = (p: unknown) => {
      useMetricsStore
        .getState()
        .tick(p as Partial<import("../types").ClusterMetrics>);
    };
    socket.on(SocketEvents.MetricsTick, onTick);
    return () => {
      socket.off(SocketEvents.MetricsTick, onTick);
    };
  }, []);
}
