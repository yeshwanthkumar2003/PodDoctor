import { create } from "zustand";
import type { Incident, TimelineEvent } from "../types";
import { seedIncidents } from "../lib/mockData";
import { uid } from "../lib/utils";

interface IncidentsState {
  incidents: Incident[];
  activeId: string | null;
  setActive: (id: string | null) => void;
  addIncident: (i: Incident) => void;
  updateIncident: (id: string, patch: Partial<Incident>) => void;
  appendTimeline: (id: string, ev: Omit<TimelineEvent, "id" | "ts">) => void;
}

export const useIncidentsStore = create<IncidentsState>((set, get) => ({
  incidents: seedIncidents,
  activeId: seedIncidents[0]?.id ?? null,
  setActive: (id) => set({ activeId: id }),
  addIncident: (i) =>
    set((s) => ({ incidents: [i, ...s.incidents], activeId: i.id })),
  updateIncident: (id, patch) =>
    set((s) => ({
      incidents: s.incidents.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),
  appendTimeline: (id, ev) => {
    const i = get().incidents.find((x) => x.id === id);
    if (!i) return;
    set((s) => ({
      incidents: s.incidents.map((x) =>
        x.id === id
          ? {
              ...x,
              timeline: [...x.timeline, { ...ev, id: uid("t"), ts: Date.now() }],
            }
          : x
      ),
    }));
  },
}));
