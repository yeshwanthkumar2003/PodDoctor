import { useMemo } from "react";
import { Sparkline } from "../ui/Sparkline";
import { Badge } from "../ui/Badge";
import { rand } from "../../lib/utils";
import { useTopologyStore } from "../../store/useTopologyStore";

export interface ServiceSpec {
  name: string;
  namespace: string;
  kind: string;
  desired: number;
}

export const SERVICES: ServiceSpec[] = [
  { name: "payments-api", namespace: "payments", kind: "Deployment", desired: 8 },
  { name: "users-service", namespace: "auth", kind: "Deployment", desired: 6 },
  { name: "ml-inference", namespace: "ml-inference", kind: "StatefulSet", desired: 3 },
];

function spark(seed: number) {
  return Array.from({ length: 24 }, (_, i) =>
    Math.max(0.05, 0.4 + Math.sin(i * 0.5 + seed) * 0.25 + rand(0, 0.08))
  );
}

export function ServiceTiles() {
  const pods = useTopologyStore((s) => s.pods);
  const sparks = useMemo(() => SERVICES.map((_, i) => spark(i * 1.3)), []);

  const tiles = useMemo(() => {
    return SERVICES.map((svc) => {
      const matched = pods.filter((p) => p.namespace === svc.namespace);
      const healthy = matched.filter((p) => p.health === "healthy").length;
      // ready/desired ratio derived from real pods, capped to desired
      const ready = Math.min(svc.desired, healthy || Math.max(1, matched.length));
      const failed = matched.filter((p) => p.health === "critical").length;

      const status: "Healthy" | "Degraded" | "Critical" =
        failed > 0
          ? "Critical"
          : ready < svc.desired
          ? "Degraded"
          : "Healthy";

      const color =
        status === "Critical" ? "#ef4444" : status === "Degraded" ? "#f59e0b" : "#22d3ee";

      return { svc, ready, status, color };
    });
  }, [pods]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {tiles.map(({ svc, ready, status, color }, i) => (
        <div key={svc.name} className="surface card-hover px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-white">
                {svc.name}
              </div>
              <div className="text-[11px] text-white/45">
                {svc.kind} · {ready} / {svc.desired} pods
              </div>
            </div>
            <Badge
              tone={
                status === "Healthy"
                  ? "success"
                  : status === "Degraded"
                  ? "warning"
                  : "danger"
              }
              dot
            >
              {status}
            </Badge>
          </div>
          <div className="-mx-1 mt-2">
            <Sparkline values={sparks[i]} color={color} height={28} />
          </div>
        </div>
      ))}
    </div>
  );
}
