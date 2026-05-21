import { cn } from "../../lib/utils";

interface Props {
  value: number; // 0..1
  tone?: "accent" | "success" | "warning" | "danger";
  size?: "xs" | "sm";
  className?: string;
}

const tones = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const heights = { xs: "h-1", sm: "h-1.5" };

export function ProgressBar({ value, tone = "accent", size = "xs", className }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-white/[0.06]",
        heights[size],
        className
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
