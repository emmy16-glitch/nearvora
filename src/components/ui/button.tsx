import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "soft";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-soft active:translate-y-px font-semibold shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)]",
  secondary:
    "bg-surface-3 text-fg hover:bg-surface-2 border border-line-strong active:translate-y-px",
  ghost: "bg-transparent text-muted hover:text-fg hover:bg-surface-2",
  outline:
    "bg-transparent text-fg border border-line-strong hover:bg-surface-2 active:translate-y-px",
  danger: "bg-danger/12 text-danger border border-danger/30 hover:bg-danger/20",
  soft: "bg-accent/12 text-lavender hover:bg-accent/20 border border-accent/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-sm gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-lg",
};

export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
