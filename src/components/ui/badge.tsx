import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const variants: Record<Variant, string> = {
  neutral: "border-line-strong bg-surface-3 text-muted",
  accent: "border-accent/30 bg-accent/10 text-accent",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
  info: "border-teal/25 bg-teal/10 text-teal",
};

export function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function DemoBadge({ label = "Demo" }: { label?: string }) {
  return (
    <Badge variant="warning" title="Simulated data — no real money">
      <span className="size-1.5 rounded-full bg-warning" aria-hidden />
      {label}
    </Badge>
  );
}

const statusVariants: Record<string, Variant> = {
  completed: "success",
  pending: "warning",
  processing: "info",
  failed: "danger",
  cancelled: "neutral",
  AWAITING_APPROVAL: "warning",
  APPROVED: "info",
  EXECUTING: "info",
  PARTIALLY_COMPLETED: "warning",
  COMPLETED: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
  DRAFT: "neutral",
  VALIDATING: "info",
  low: "success",
  medium: "warning",
  high: "danger",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={statusVariants[status] ?? "neutral"}>
      {status.replaceAll("_", " ").toLowerCase()}
    </Badge>
  );
}
