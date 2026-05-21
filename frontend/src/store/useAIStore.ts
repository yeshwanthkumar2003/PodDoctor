import { create } from "zustand";
import type { AIStatus } from "../types";
import { initialAI } from "../lib/mockData";

interface AIState {
  status: AIStatus;
  analyzing: boolean;
  setAnalyzing: (v: boolean) => void;
  setStatus: (patch: Partial<AIStatus>) => void;
}

export const useAIStore = create<AIState>((set) => ({
  status: initialAI,
  analyzing: false,
  setAnalyzing: (v) => set({ analyzing: v }),
  setStatus: (patch) => set((s) => ({ status: { ...s.status, ...patch } })),
}));
