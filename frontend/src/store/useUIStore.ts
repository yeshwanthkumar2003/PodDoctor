import { create } from "zustand";

export type Route =
  | "overview"
  | "clusters"
  | "nodes"
  | "pods"
  | "services"
  | "workloads"
  | "incidents"
  | "ai"
  | "remediation"
  | "metrics"
  | "logs"
  | "alerts"
  | "settings";

export type ViewMode = "2d";

interface UIState {
  route: Route;
  sidebarCollapsed: boolean;
  rightPanelOpen: boolean;
  viewMode: ViewMode;
  setRoute: (r: Route) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setViewMode: (m: ViewMode) => void;
}

export const useUIStore = create<UIState>((set) => ({
  route: "overview",
  sidebarCollapsed: false,
  rightPanelOpen: true,
  viewMode: "2d",
  setRoute: (route) => set({ route }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setViewMode: (viewMode) => set({ viewMode }),
}));
