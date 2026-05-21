import { create } from "zustand";
import type { ClusterNode, Pod, ServiceLink } from "../types";
import { generateLinks, generateNodes, generatePods } from "../lib/mockData";

interface TopologyState {
  nodes: ClusterNode[];
  pods: Pod[];
  links: ServiceLink[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  updateNodeMetrics: (id: string, metrics: Partial<ClusterNode["metrics"]>) => void;
  setNodeHealth: (id: string, h: ClusterNode["health"]) => void;
  setPodHealth: (id: string, h: Pod["health"]) => void;
}

const nodes = generateNodes();
const pods = generatePods(nodes);
const links = generateLinks(nodes);

export const useTopologyStore = create<TopologyState>((set) => ({
  nodes,
  pods,
  links,
  selectedNodeId: null,
  hoveredNodeId: null,
  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),
  updateNodeMetrics: (id, metrics) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, metrics: { ...n.metrics, ...metrics } } : n
      ),
    })),
  setNodeHealth: (id, h) =>
    set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, health: h } : n)) })),
  setPodHealth: (id, h) =>
    set((s) => ({ pods: s.pods.map((p) => (p.id === id ? { ...p, health: h } : p)) })),
}));
