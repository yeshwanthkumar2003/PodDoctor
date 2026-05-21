import { Plus, Minus, Crosshair } from "lucide-react";

export function ZoomControls() {
  return (
    <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
      {[Plus, Minus, Crosshair].map((Icon, i) => (
        <button
          key={i}
          className="pointer-events-auto grid h-7 w-7 place-items-center rounded-md border border-white/[0.08] bg-white/[0.04] text-white/55 backdrop-blur hover:text-white"
        >
          <Icon size={12} />
        </button>
      ))}
    </div>
  );
}
