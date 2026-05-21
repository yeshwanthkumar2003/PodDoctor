import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "icon" | "icon-sm";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-bg-deep hover:bg-accent-soft font-semibold",
  secondary:
    "bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08]",
  ghost: "hover:bg-white/[0.05] text-white/75 hover:text-white",
  outline:
    "border border-white/10 hover:border-white/20 text-white/85 hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px] gap-1.5",
  md: "h-9 px-4 text-[13px] gap-2",
  icon: "h-8 w-8 p-0",
  "icon-sm": "h-6 w-6 p-0",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "secondary", size = "md", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/60 disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    />
  );
});
