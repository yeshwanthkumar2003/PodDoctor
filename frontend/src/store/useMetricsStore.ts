import { create } from "zustand";
import type { ClusterMetrics } from "../types";
import { initialMetrics } from "../lib/mockData";
import { clamp } from "../lib/utils";

interface MetricsState {
  metrics: ClusterMetrics;
  tick: (partial?: Partial<ClusterMetrics>) => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  metrics: initialMetrics,
  tick: (partial) =>
    set((s) => {
      const next: ClusterMetrics = { ...s.metrics, ...partial };
      next.history = [...s.metrics.history.slice(-31), clamp(next.health)];
      return { metrics: next };
    }),
}));
