import { useState } from "react";
import { ChevronDown, ChevronRight, Zap } from "lucide-react";
import { IncidentCard } from "./IncidentCard";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { useIncidentsStore } from "../../store/useIncidentsStore";
import { cn, formatRelative } from "../../lib/utils";

export function RightPanel() {
  const incidents = useIncidentsStore((s) => s.incidents);
  const activeId = useIncidentsStore((s) => s.activeId);
  const setActive = useIncidentsStore((s) => s.setActive);
  const active = incidents.find((i) => i.id === activeId) ?? incidents[0];

  const [timelineOpen, setTimelineOpen] = useState(false);
  const visibleIncidents = incidents.slice(0, 4);
  const openCount = incidents.filter((i) => i.status !== "resolved").length;

  return (
    <aside className="flex w-[340px] shrink-0 flex-col overflow-hidden border-l border-white/[0.06] bg-bg-deep/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
            Active Incidents
          </span>
          <span className="grid h-5 min-w-[20px] place-items-center rounded-md bg-danger/15 px-1 text-[10px] font-semibold text-danger">
            {openCount}
          </span>
        </div>
        <button className="flex items-center gap-1 text-[11px] text-white/45 hover:text-white">
          View all <ChevronDown size={11} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* Incident list */}
        <div className="space-y-2">
          {visibleIncidents.map((i) => (
            <IncidentCard
              key={i.id}
              incident={i}
              active={i.id === active?.id}
              onClick={() => setActive(i.id)}
            />
          ))}
        </div>

        {active && (
          <>
            <div className="divider" />

            {/* AI ANALYSIS */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="label">AI Analysis</span>
                <span className="text-[10px] text-white/35">
                  {formatRelative(active.createdAt)}
                </span>
              </div>

              {/* Root cause */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                  Root cause
                </div>
                <p className="text-[12.5px] leading-relaxed text-white/85">
                  {active.rootCause ??
                    "Inspecting pod logs, recent events, and node-level conditions…"}
                </p>
              </div>

              {/* Confidence */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                    Confidence
                  </div>
                  <div className="text-mono text-[11px] text-white/70">
                    {Math.round((active.confidence ?? 0.62) * 100)}%
                  </div>
                </div>
                <ProgressBar value={active.confidence ?? 0.62} tone="accent" />
              </div>

              {/* Suggested fix */}
              <div className="space-y-2">
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                  Suggested fix
                </div>
                <p className="text-[12.5px] leading-relaxed text-white/85">
                  {active.remediation ??
                    "Roll the affected deployment with the previous known-good image and increase the memory request by 20%."}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="primary" size="sm" className="gap-1.5">
                    <Zap size={12} />
                    Auto-Remediate
                  </Button>
                  <Button variant="outline" size="sm">
                    Manual
                  </Button>
                </div>
              </div>

              {/* Progress */}
              {active.status !== "resolved" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                      Progress
                    </div>
                    <div className="text-mono text-[11px] text-white/70">
                      {Math.round((active.progress ?? 0.55) * 100)}%
                    </div>
                  </div>
                  <ProgressBar
                    value={active.progress ?? 0.55}
                    tone={active.status === "remediating" ? "danger" : "warning"}
                  />
                </div>
              )}
            </section>

            <div className="divider" />

            {/* Timeline */}
            <section className="space-y-2">
              <button
                onClick={() => setTimelineOpen((v) => !v)}
                className="flex w-full items-center justify-between"
              >
                <span className="label">Timeline</span>
                <ChevronRight
                  size={12}
                  className={cn(
                    "text-white/45 transition-transform",
                    timelineOpen && "rotate-90"
                  )}
                />
              </button>
              <ul className="space-y-2">
                {(timelineOpen
                  ? active.timeline
                  : active.timeline.slice(-3)
                ).map((ev) => (
                  <li key={ev.id} className="flex gap-2.5">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] text-white/85">
                        {ev.message}
                      </div>
                      <div className="text-[10px] text-white/35">
                        {formatRelative(ev.ts)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
