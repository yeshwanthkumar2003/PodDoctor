import { useMemo } from "react";
import { Maximize2, RotateCcw, Lock } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Topology2D } from "./Topology2D";
import { ServiceTiles, SERVICES } from "./ServiceTiles";
import { useTopologyStore } from "../../store/useTopologyStore";

export function TopologyCard() {
  const nodes = useTopologyStore((s) => s.nodes);
  const pods = useTopologyStore((s) => s.pods);

  // "Services" in the header should align with the service tiles shown below.
  const serviceCount = SERVICES.length;

  // Overall cluster health rolled up from node health
  const clusterTone = useMemo(() => {
    if (nodes.some((n) => n.health === "critical")) return "danger" as const;
    if (nodes.some((n) => n.health === "warning")) return "warning" as const;
    return "success" as const;
  }, [nodes]);

  const clusterLabel =
    clusterTone === "danger"
      ? "Degraded"
      : clusterTone === "warning"
      ? "Warning"
      : "Healthy";

  return (
    <section className="card flex flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <div className="min-w-0">
          <div className="label">Cluster Topology</div>
          <h1 className="mt-1 text-[20px] font-semibold leading-none text-white">
            prod-us-east-1
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{nodes.length} Nodes</Badge>
            <Badge tone="neutral">{pods.length} Pods</Badge>
            <Badge tone="neutral">{serviceCount} Services</Badge>
            <Badge tone={clusterTone} dot>
              {clusterLabel}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-8 items-center rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5 text-[11px]">
            <button className="h-full rounded bg-white/[0.08] px-2.5 font-medium uppercase tracking-wide text-white">
              2D
            </button>
            <button
              disabled
              title="3D view disabled"
              className="flex h-full cursor-not-allowed items-center gap-1 rounded px-2.5 font-medium uppercase tracking-wide text-white/25"
            >
              3D
              <Lock size={9} />
            </button>
          </div>
          <button
            className="grid h-8 w-8 place-items-center rounded-md border border-white/[0.08] text-white/55 hover:text-white"
            aria-label="Reset view"
          >
            <RotateCcw size={13} />
          </button>
          <button
            className="grid h-8 w-8 place-items-center rounded-md border border-white/[0.08] text-white/55 hover:text-white"
            aria-label="Fullscreen"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </header>

      <div className="relative h-[440px] w-full overflow-hidden bg-bg-deep">
        <Topology2D />
      </div>

      <div className="border-t border-white/[0.06] p-4">
        <ServiceTiles />
      </div>
    </section>
  );
}
