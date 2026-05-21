import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelative(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

export function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// Calmer palette, status-only saturation
const PAL = {
  healthy: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  recovering: "#22d3ee",
  accent: "#22d3ee",
};

export function severityColor(s: "info" | "warning" | "critical") {
  return s === "critical"
    ? "text-danger"
    : s === "warning"
    ? "text-warning"
    : "text-accent";
}

export function healthColor(
  h: "healthy" | "warning" | "critical" | "recovering"
) {
  return PAL[h];
}

export function healthTone(
  h: "healthy" | "warning" | "critical" | "recovering"
): "success" | "warning" | "danger" | "accent" {
  if (h === "healthy") return "success";
  if (h === "warning") return "warning";
  if (h === "critical") return "danger";
  return "accent";
}
