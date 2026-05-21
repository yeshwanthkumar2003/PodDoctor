interface Props {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}

/** Circular progress donut — used for the cluster-health card. */
export function Donut({
  value,
  size = 72,
  stroke = 6,
  color = "#22c55e",
  label,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const offset = c * (1 - pct);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-tight">
          <div className="text-[15px] font-semibold text-white">
            {Math.round(pct * 100)}%
          </div>
          {label && <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>}
        </div>
      </div>
    </div>
  );
}
