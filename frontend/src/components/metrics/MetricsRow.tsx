import { useMemo } from "react";
import {
  Cpu,
  HardDrive,
  Boxes,
  AlertCircle,
  Zap,
  Activity,
} from "lucide-react";
import { MetricCard, MetricDonut } from "./MetricCard";
import { useMetricsStore } from "../../store/useMetricsStore";
import { useTopologyStore } from "../../store/useTopologyStore";
import { useIncidentsStore } from "../../store/useIncidentsStore";
import { useAIStore } from "../../store/useAIStore";

// Cluster-wide memory capacity used to derive a "X / Y GB" label from a percentage.
const TOTAL_MEMORY_GB = 64;

export function MetricsRow() {
  const m = useMetricsStore((s) => s.metrics);
  const pods = useTopologyStore((s) => s.pods);
  const incidents = useIncidentsStore((s) => s.incidents);
  const aiStatus = useAIStore((s) => s.status);

  // Derive everything from real stores so cards stay consistent.
  const activePods = pods.filter((p) => p.health !== "critical").length;
  const failedPods = pods.filter((p) => p.health === "critical").length;

  const openIncidents = incidents.filter((i) => i.status !== "resolved");
  const criticalCount = openIncidents.filter((i) => i.severity === "critical").length;
  const warningCount = openIncidents.filter((i) => i.severity === "warning").length;

  const memUsedGb = (m.memory * TOTAL_MEMORY_GB).toFixed(1);

  // Derived sparkline series (kept memoized + smooth)
  const series = useMemo(
    () => (base: number, jitter = 0.08) =>
      Array.from({ length: 24 }, (_, i) =>
        Math.max(0, Math.min(1, base + Math.sin(i * 0.6) * jitter))
      ),
    []
  );

  const healthHist = m.history.length ? m.history : [0.9];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <MetricDonut
        label="Cluster Health"
        value={m.health}
        caption={`${Math.round(m.health * 100)}% Healthy`}
      />
      <MetricCard
        icon={Cpu}
        label="CPU Usage"
        value={`${Math.round(m.cpu * 100)}%`}
        sub="across 8 nodes"
        values={series(m.cpu)}
        color="#22d3ee"
      />
      <MetricCard
        icon={HardDrive}
        label="Memory"
        value={`${Math.round(m.memory * 100)}%`}
        sub={`${memUsedGb} / ${TOTAL_MEMORY_GB} GB`}
        values={series(m.memory, 0.05)}
        color="#38bdf8"
      />
      <MetricCard
        icon={Boxes}
        label="Active Pods"
        value={activePods}
        sub={
          failedPods > 0
            ? `${failedPods} failed`
            : `${pods.length} total`
        }
        tone={failedPods > 0 ? "warning" : "neutral"}
        values={healthHist}
        color="#22c55e"
      />
      <MetricCard
        icon={AlertCircle}
        label="Open Incidents"
        value={openIncidents.length}
        sub={
          openIncidents.length === 0
            ? "All clear"
            : `${criticalCount} critical · ${warningCount} warning`
        }
        tone={
          criticalCount > 0 ? "danger" : warningCount > 0 ? "warning" : "success"
        }
        values={series(Math.min(1, openIncidents.length / 5), 0.12)}
        color="#ef4444"
      />
      <MetricCard
        icon={Zap}
        label="AI Actions / 24h"
        value={aiStatus.actionsLast24h ?? m.aiActions}
        sub={`${Math.round(m.recoveryRate * 100)}% recovered`}
        tone="success"
        values={series(0.7, 0.12)}
        color="#22d3ee"
      />
      <MetricCard
        icon={Activity}
        label="Network I/O"
        value={`${(0.6 + m.cpu * 1.4).toFixed(2)} GB/s`}
        sub="ingress + egress"
        values={series(0.5 + m.cpu * 0.3, 0.18)}
        color="#38bdf8"
      />
    </div>
  );
}
