import {
  Bell,
  ChevronDown,
  Search,
  Sun,
  Sparkles,
  PanelRight,
} from "lucide-react";
import { Button } from "../ui/Button";
import { useUIStore } from "../../store/useUIStore";

export function TopNavbar() {
  const toggleRight = useUIStore((s) => s.toggleRightPanel);
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-white/[0.06] bg-bg-deep/95 px-4 backdrop-blur">
      {/* Brand */}
      <div className="flex items-center gap-2.5 pr-3">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-accent/15 text-accent">
          <Sparkles size={14} strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold text-white">PodDoctor</div>
          <div className="text-[10px] tracking-wider text-white/40">
            AI SRE CONSOLE
          </div>
        </div>
      </div>

      {/* Cluster selector */}
      <button className="flex h-8 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 text-[12px] text-white/80 hover:bg-white/[0.05]">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-soft-pulse" />
        <span>prod-us-east-1</span>
        <ChevronDown size={13} className="text-white/40" />
      </button>

      {/* Search */}
      <div className="relative mx-2 hidden max-w-[520px] flex-1 md:flex">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
        />
        <input
          placeholder="Search pods, nodes, incidents, services…"
          className="h-9 w-full rounded-md border border-white/[0.07] bg-white/[0.03] pl-9 pr-16 text-[13px] text-white placeholder:text-white/35 focus:border-accent/40 focus:outline-none"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/40">
          ⌘K
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-md border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] text-success lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          AI Engine Online
        </div>

        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell size={15} />
          <span className="absolute right-1 top-1 grid h-3.5 min-w-[14px] place-items-center rounded-full bg-danger px-0.5 text-[9px] font-semibold text-white">
            4
          </span>
        </Button>

        <Button variant="ghost" size="icon" aria-label="Theme">
          <Sun size={15} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle right panel"
          onClick={toggleRight}
        >
          <PanelRight size={15} />
        </Button>

        <div className="ml-1 flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.03] py-1 pl-1 pr-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent to-accent-deep text-[11px] font-semibold text-bg-deep">
            YS
          </div>
          <div className="hidden text-left leading-tight md:block">
            <div className="text-[12px] font-medium text-white">Yess Sharma</div>
            <div className="text-[10px] text-white/40">SRE Admin</div>
          </div>
          <ChevronDown size={13} className="text-white/40" />
        </div>
      </div>
    </header>
  );
}
