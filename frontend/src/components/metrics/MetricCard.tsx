import { Sparkline } from "../ui/Sparkline";
import { Donut } from "../ui/Donut";
import { cn } from "../../lib/utils";
import type { ComponentType, ReactNode } from "react";

interface Props {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: ReactNode;
  sub?: string;
  values?: number[];
  color?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}

const toneText = {
  neutral: "text-white/45",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  values,
  color = "#22d3ee",
  tone = "neutral",
}: Props) {
  return (
    <div className="card card-hover flex flex-col gap-2 p-3.5">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <Icon size={13} />
      </div>
      <div className="text-[22px] font-semibold leading-none text-white">
        {value}
      </div>
      {sub && (
        <div className={cn("text-[11px]", toneText[tone])}>{sub}</div>
      )}
      {values && (
        <div className="mt-1 -mx-0.5">
          <Sparkline values={values} color={color} height={26} />
        </div>
      )}
    </div>
  );
}

interface DonutProps {
  label: string;
  value: number; // 0..1
  caption?: string;
}

export function MetricDonut({ label, value, caption }: DonutProps) {
  const color = value > 0.85 ? "#22c55e" : value > 0.6 ? "#f59e0b" : "#ef4444";
  return (
    <div className="card card-hover flex items-center gap-3 p-3.5">
      <Donut value={value} color={color} label="Healthy" size={64} stroke={6} />
      <div className="min-w-0">
        <div className="label">{label}</div>
        <div className="mt-1 text-[14px] font-medium text-white">
          {caption ?? "Cluster nominal"}
        </div>
        <div className="text-[11px] text-white/45">All zones reporting</div>
      </div>
    </div>
  );
}
