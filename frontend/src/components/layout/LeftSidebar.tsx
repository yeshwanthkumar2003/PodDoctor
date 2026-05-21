import {
  LayoutDashboard,
  Server,
  HardDrive,
  Boxes,
  Workflow,
  Layers,
  AlertTriangle,
  Brain,
  Wand2,
  Activity,
  ScrollText,
  BellRing,
  Settings,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "../../lib/utils";
import { useIncidentsStore } from "../../store/useIncidentsStore";
import { useUIStore, type Route } from "../../store/useUIStore";

interface Item {
  id: Route;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  badge?: () => number | undefined;
}

const items: Item[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "clusters", label: "Clusters", icon: Server },
  { id: "nodes", label: "Nodes", icon: HardDrive },
  { id: "pods", label: "Pods", icon: Boxes },
  { id: "services", label: "Services", icon: Workflow },
  { id: "workloads", label: "Workloads", icon: Layers },
  {
    id: "incidents",
    label: "Incidents",
    icon: AlertTriangle,
    badge: () =>
      useIncidentsStore
        .getState()
        .incidents.filter((i) => i.status !== "resolved").length || undefined,
  },
  { id: "ai", label: "AI Analysis", icon: Brain },
  { id: "remediation", label: "Remediation", icon: Wand2 },
  { id: "metrics", label: "Metrics", icon: Activity },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "alerts", label: "Alerts", icon: BellRing },
  { id: "settings", label: "Settings", icon: Settings },
];

export function LeftSidebar() {
  const route = useUIStore((s) => s.route);
  const setRoute = useUIStore((s) => s.setRoute);
  const incidents = useIncidentsStore((s) => s.incidents);
  const activeIncidents = incidents.filter((i) => i.status !== "resolved").length;

  return (
    <aside className="flex w-[208px] shrink-0 flex-col border-r border-white/[0.06] bg-bg-deep/60">
      <nav className="flex-1 overflow-y-auto p-2.5">
        <ul className="space-y-0.5">
          {items.map((it) => {
            const active = route === it.id;
            const Icon = it.icon;
            const badge =
              it.id === "incidents" && activeIncidents > 0 ? activeIncidents : undefined;
            return (
              <li key={it.id}>
                <button
                  onClick={() => setRoute(it.id)}
                  className={cn(
                    "relative flex h-8 w-full items-center gap-2.5 rounded-md pl-3 pr-2 text-left text-[12.5px] transition-colors",
                    active
                      ? "bg-white/[0.05] text-white"
                      : "text-white/55 hover:bg-white/[0.03] hover:text-white/85"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-accent" />
                  )}
                  <Icon size={14} strokeWidth={2} />
                  <span className="flex-1 truncate">{it.label}</span>
                  {badge && (
                    <span className="grid h-4 min-w-[16px] place-items-center rounded-md bg-danger/15 px-1 text-[10px] font-semibold text-danger">
                      {badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/[0.06] p-3 text-[10px] leading-tight text-white/40">
        <div className="font-mono">v2.4.1 · build a17e</div>
        <div className="mt-0.5">Region: us-east-1</div>
      </div>
    </aside>
  );
}
