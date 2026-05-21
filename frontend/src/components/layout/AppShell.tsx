import { useRealtime } from "../../lib/useRealtime";
import { TopNavbar } from "./TopNavbar";
import { LeftSidebar } from "./LeftSidebar";
import { CenterColumn } from "./CenterColumn";
import { RightPanel } from "../incidents/RightPanel";
import { useUIStore } from "../../store/useUIStore";

export function AppShell() {
  useRealtime();
  const rightOpen = useUIStore((s) => s.rightPanelOpen);

  return (
    <div className="flex h-screen w-screen flex-col bg-bg text-white">
      <TopNavbar />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <CenterColumn />
        {rightOpen && <RightPanel />}
      </div>
    </div>
  );
}
