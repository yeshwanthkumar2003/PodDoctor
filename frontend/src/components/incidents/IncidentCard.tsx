import { cn, formatRelative } from "../../lib/utils";
import type { Incident } from "../../types";

interface Props {
  incident: Incident;
  active: boolean;
  onClick: () => void;
}

const statusTone: Record<Incident["status"], string> = {
  detected: "bg-warning/15 text-warning border-warning/25",
  analyzing: "bg-warning/15 text-warning border-warning/25",
  remediating: "bg-danger/15 text-danger border-danger/25",
  resolved: "bg-success/15 text-success border-success/25",
};

const statusLabel: Record<Incident["status"], string> = {
  detected: "DETECTED",
  analyzing: "ANALYZING",
  remediating: "REMEDIATING",
  resolved: "RESOLVED",
};

export function IncidentCard({ incident, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-accent/30 bg-accent/[0.05]"
          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
      )}
    >
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r bg-accent" />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium text-white">
            {incident.title}
          </div>
          <div className="mt-0.5 text-[11px] text-white/45">
            {incident.podId ?? incident.nodeId ?? "cluster"} ·{" "}
            {formatRelative(incident.createdAt)}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wider",
            statusTone[incident.status]
          )}
        >
          {statusLabel[incident.status]}
        </span>
      </div>
    </button>
  );
}
