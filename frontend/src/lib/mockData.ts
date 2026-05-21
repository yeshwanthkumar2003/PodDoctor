import type {
  ClusterNode,
  Pod,
  ServiceLink,
  Incident,
  ClusterMetrics,
  AIStatus,
} from "../types";
import { rand, uid } from "./utils";

const ZONES = ["us-east-1a", "us-east-1b", "us-west-2a", "eu-west-1a"];
const NAMESPACES = ["payments", "auth", "checkout", "search", "ml-inference", "ingress"];
const IMAGES = [
  "registry/payments-api:1.42",
  "registry/auth-svc:2.8",
  "registry/checkout-worker:3.1",
  "registry/search-indexer:0.9",
  "registry/ml-infer:4.0-gpu",
  "registry/nginx-ingress:1.10",
];

export function generateNodes(): ClusterNode[] {
  const nodes: ClusterNode[] = [];
  const ring = 7;
  const count = 7;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * ring;
    const z = Math.sin(angle) * ring;
    const y = (i % 2 === 0 ? 0.5 : -0.5) + Math.sin(i) * 0.3;
    nodes.push({
      id: `node-${i + 1}`,
      name: `k8s-worker-${String(i + 1).padStart(2, "0")}`,
      zone: ZONES[i % ZONES.length],
      role: i === 0 ? "control-plane" : i === 6 ? "gpu" : "worker",
      position: [x, y, z],
      health: i === 3 ? "warning" : "healthy",
      metrics: {
        cpu: rand(0.18, 0.62),
        memory: rand(0.22, 0.7),
        network: rand(0.1, 0.6),
        pods: Math.floor(rand(8, 28)),
      },
    });
  }
  // center control plane
  nodes.unshift({
    id: "node-cp",
    name: "k8s-control-plane",
    zone: "us-east-1a",
    role: "control-plane",
    position: [0, 1.4, 0],
    health: "healthy",
    metrics: { cpu: 0.34, memory: 0.41, network: 0.28, pods: 5 },
  });
  return nodes;
}

export function generatePods(nodes: ClusterNode[]): Pod[] {
  const pods: Pod[] = [];
  nodes.forEach((node) => {
    const count = node.role === "control-plane" ? 3 : Math.floor(rand(4, 8));
    for (let i = 0; i < count; i++) {
      const theta = rand(0, Math.PI * 2);
      const phi = rand(0, Math.PI);
      const r = rand(0.9, 1.6);
      pods.push({
        id: uid("pod"),
        name: `${NAMESPACES[i % NAMESPACES.length]}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        namespace: NAMESPACES[i % NAMESPACES.length],
        nodeId: node.id,
        health: Math.random() < 0.06 ? "warning" : "healthy",
        cpu: rand(0.05, 0.65),
        memory: rand(0.1, 0.7),
        restarts: Math.random() < 0.1 ? Math.floor(rand(1, 4)) : 0,
        image: IMAGES[i % IMAGES.length],
        offset: [
          Math.sin(phi) * Math.cos(theta) * r,
          Math.cos(phi) * r * 0.6,
          Math.sin(phi) * Math.sin(theta) * r,
        ],
      });
    }
  });
  return pods;
}

export function generateLinks(nodes: ClusterNode[]): ServiceLink[] {
  const links: ServiceLink[] = [];
  for (let i = 1; i < nodes.length; i++) {
    links.push({
      id: uid("link"),
      fromNodeId: nodes[0].id,
      toNodeId: nodes[i].id,
      protocol: i % 3 === 0 ? "grpc" : "http",
      rps: Math.floor(rand(50, 1200)),
    });
  }
  // a few cross links
  for (let i = 0; i < 5; i++) {
    const a = Math.floor(rand(1, nodes.length));
    let b = Math.floor(rand(1, nodes.length));
    if (b === a) b = (b + 1) % nodes.length;
    links.push({
      id: uid("link"),
      fromNodeId: nodes[a].id,
      toNodeId: nodes[b].id,
      protocol: "http",
      rps: Math.floor(rand(20, 600)),
    });
  }
  return links;
}

export const initialMetrics: ClusterMetrics = {
  health: 0.96,
  cpu: 0.42,
  memory: 0.51,
  activePods: 187,
  failedPods: 2,
  aiActions: 28,
  recoveryRate: 0.974,
  history: Array.from({ length: 32 }, () => rand(0.3, 0.7)),
};

export const initialAI: AIStatus = {
  online: true,
  model: "poddoctor-mini-2.1",
  inferenceMs: 142,
  actionsLast24h: 64,
};

export const seedIncidents: Incident[] = [
  {
    id: uid("inc"),
    title: "CrashLoopBackOff · payments-api",
    severity: "critical",
    status: "remediating",
    createdAt: Date.now() - 1000 * 60 * 4,
    rootCause:
      "Pod terminated due to OOMKilled — memory limit (512Mi) exceeded by JVM heap spike triggered by /v1/refunds bulk endpoint.",
    confidence: 0.92,
    remediation:
      "Increase memory limit to 1Gi, enable HPA on memory, apply rolling restart with circuit breaker on /refunds.",
    progress: 0.62,
    timeline: [
      { id: uid("t"), ts: Date.now() - 240000, kind: "detect", message: "Detected pod restart loop (3 restarts / 60s)" },
      { id: uid("t"), ts: Date.now() - 220000, kind: "analyze", message: "Correlating with memory pressure on node-3" },
      { id: uid("t"), ts: Date.now() - 180000, kind: "analyze", message: "Identified root cause: OOMKilled (exit 137)" },
      { id: uid("t"), ts: Date.now() - 90000, kind: "action", message: "Patched deployment payments-api memory: 1Gi" },
      { id: uid("t"), ts: Date.now() - 30000, kind: "verify", message: "Rolling restart in progress · 2/4 ready" },
    ],
  },
  {
    id: uid("inc"),
    title: "Node pressure · k8s-worker-04",
    severity: "warning",
    status: "analyzing",
    createdAt: Date.now() - 1000 * 60 * 11,
    rootCause: "Disk pressure trending up — kubelet eviction threshold imminent.",
    confidence: 0.78,
    remediation: "Cordon node, drain non-critical pods, expand EBS volume to 200Gi.",
    progress: 0.32,
    timeline: [
      { id: uid("t"), ts: Date.now() - 660000, kind: "detect", message: "Disk usage > 82% on /var/lib/kubelet" },
      { id: uid("t"), ts: Date.now() - 480000, kind: "analyze", message: "Forecasting eviction in ~14 min" },
    ],
  },
];
