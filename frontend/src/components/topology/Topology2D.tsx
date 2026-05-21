import { useEffect, useRef, useState } from "react";
import { useTopologyStore } from "../../store/useTopologyStore";
import { healthColor } from "../../lib/utils";
import { ZoomControls } from "./ZoomControls";

const W = 1000;
const H = 440;
const CENTER = { x: W / 2, y: H / 2 };
const RING_R = 165;

/** Project a 3D position from the topology store onto 2D layout coords. */
function project(pos: [number, number, number], i: number, total: number) {
  // Control plane (index 0 in mock data) sits at origin; workers are on a ring.
  if (pos[0] === 0 && pos[2] === 0) return CENTER;
  const angle = (i / Math.max(1, total - 1)) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER.x + Math.cos(angle) * RING_R,
    y: CENTER.y + Math.sin(angle) * RING_R,
  };
}

export function Topology2D() {
  const nodes = useTopologyStore((s) => s.nodes);
  const pods = useTopologyStore((s) => s.pods);
  const links = useTopologyStore((s) => s.links);
  const selectedNodeId = useTopologyStore((s) => s.selectedNodeId);
  const select = useTopologyStore((s) => s.selectNode);

  const [tick, setTick] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    let last = performance.now();
    const loop = (t: number) => {
      if (t - last > 50) {
        setTick((x) => (x + 1) % 10000);
        last = t;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  // workers (non-center) for ring distribution
  const workers = nodes.filter((n) => !(n.position[0] === 0 && n.position[2] === 0));
  const control = nodes.find((n) => n.position[0] === 0 && n.position[2] === 0);

  const nodePos = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    if (!n) return CENTER;
    if (n === control) return CENTER;
    const idx = workers.indexOf(n);
    return project(n.position, idx, workers.length);
  };

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              stroke="rgba(255,255,255,0.035)"
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#0e1530" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#070a14" stopOpacity="1" />
          </radialGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <rect width={W} height={H} fill="url(#bgGlow)" />
        <rect width={W} height={H} fill="url(#grid)" />

        {/* Concentric guide rings */}
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={RING_R}
          fill="none"
          stroke="rgba(34,211,238,0.08)"
          strokeDasharray="3 5"
        />
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={RING_R + 50}
          fill="none"
          stroke="rgba(255,255,255,0.03)"
        />

        {/* Links */}
        {links.map((l) => {
          const a = nodePos(l.fromNodeId);
          const b = nodePos(l.toNodeId);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2 - 18;
          const d = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
          // animated dash offset
          const offset = -(tick * 1.6) % 24;
          return (
            <g key={l.id}>
              <path
                d={d}
                fill="none"
                stroke="rgba(34,211,238,0.18)"
                strokeWidth="1.2"
              />
              <path
                d={d}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.4"
                strokeDasharray="2 22"
                strokeDashoffset={offset}
                strokeLinecap="round"
                opacity="0.85"
              />
            </g>
          );
        })}

        {/* Pods (small orbiting dots) */}
        {pods.map((p, i) => {
          const parent = nodePos(p.nodeId);
          const t = tick * 0.025 + i * 0.7;
          const r = 18 + ((i % 4) * 4);
          const x = parent.x + Math.cos(t + p.offset[2]) * r;
          const y = parent.y + Math.sin(t + p.offset[2]) * r;
          const c = healthColor(p.health);
          return (
            <circle
              key={p.id}
              cx={x}
              cy={y}
              r={p.health === "critical" ? 2.5 : 2}
              fill={c}
              opacity={p.health === "healthy" ? 0.8 : 1}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const isControl = n === control;
          const idx = workers.indexOf(n);
          const p = isControl ? CENTER : project(n.position, idx, workers.length);
          const color = healthColor(n.health);
          const selected = selectedNodeId === n.id;
          const size = isControl ? 26 : 20;
          return (
            <g
              key={n.id}
              transform={`translate(${p.x} ${p.y})`}
              className="cursor-pointer"
              onClick={() => select(selected ? null : n.id)}
            >
              {/* halo */}
              <circle
                r={size + (selected ? 10 : 8)}
                fill={color}
                opacity={selected ? 0.14 : n.health === "critical" ? 0.18 : 0.07}
                filter="url(#soft)"
              />
              {/* selection ring */}
              {selected && (
                <circle
                  r={size + 6}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="1.2"
                  opacity="0.7"
                />
              )}
              {/* hexagonal core */}
              <polygon
                points={hexPoints(size * 0.7)}
                fill={isControl ? "#0e1530" : "#101830"}
                stroke={color}
                strokeWidth={isControl ? 1.6 : 1.2}
              />
              <circle r={size * 0.18} fill={color} />
              {/* label */}
              <text
                y={size + 16}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(255,255,255,0.7)"
                fontFamily="Inter, system-ui"
                fontWeight="500"
              >
                {n.name}
              </text>
              <text
                y={size + 28}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(255,255,255,0.35)"
                fontFamily="Inter, system-ui"
              >
                {(n.metrics.cpu * 100).toFixed(0)}% · {(n.metrics.memory * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Center title chip */}
        {control && (
          <g transform={`translate(${CENTER.x} ${CENTER.y - 56})`}>
            <rect
              x="-44"
              y="-9"
              width="88"
              height="18"
              rx="9"
              fill="rgba(34,211,238,0.08)"
              stroke="rgba(34,211,238,0.25)"
            />
            <text
              textAnchor="middle"
              y="4"
              fontSize="9"
              fill="#22d3ee"
              fontFamily="Inter, system-ui"
              letterSpacing="1.5"
              fontWeight="600"
            >
              CONTROL PLANE
            </text>
          </g>
        )}
      </svg>

      <ZoomControls />

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-3 rounded-md border border-white/[0.08] bg-bg-deep/80 px-2.5 py-1.5 text-[10px] text-white/55 backdrop-blur">
        <LegendDot color="#22c55e" label="Healthy" />
        <LegendDot color="#f59e0b" label="Warn" />
        <LegendDot color="#ef4444" label="Critical" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function hexPoints(r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return pts.join(" ");
}
