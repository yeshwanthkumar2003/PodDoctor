export type Health = "healthy" | "warning" | "critical" | "recovering";

export interface NodeMetric {
  cpu: number;        // 0..1
  memory: number;     // 0..1
  network: number;    // 0..1
  pods: number;
}

export interface ClusterNode {
  id: string;
  name: string;
  zone: string;
  role: "control-plane" | "worker" | "gpu";
  position: [number, number, number];
  health: Health;
  metrics: NodeMetric;
}

export interface Pod {
  id: string;
  name: string;
  namespace: string;
  nodeId: string;
  health: Health;
  cpu: number;
  memory: number;
  restarts: number;
  image: string;
  offset: [number, number, number]; // relative to node
}

export interface ServiceLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  protocol: "http" | "grpc" | "tcp";
  rps: number;
}

export interface Incident {
  id: string;
  podId?: string;
  nodeId?: string;
  title: string;
  severity: "info" | "warning" | "critical";
  status: "detected" | "analyzing" | "remediating" | "resolved";
  createdAt: number;
  rootCause?: string;
  confidence?: number;
  remediation?: string;
  progress?: number;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  ts: number;
  kind: "detect" | "analyze" | "action" | "verify" | "resolve" | "alert";
  message: string;
}

export interface ClusterMetrics {
  health: number;       // 0..1
  cpu: number;
  memory: number;
  activePods: number;
  failedPods: number;
  aiActions: number;
  recoveryRate: number; // 0..1
  history: number[];    // small sparkline
}

export interface AIStatus {
  online: boolean;
  model: string;
  inferenceMs: number;
  actionsLast24h: number;
}
