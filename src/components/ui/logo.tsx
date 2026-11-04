import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function LogoMark({ className }: { className?: string }) {
  const gradientId = `nv-logo-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      viewBox="0 0 34 32"
      className={cn("size-7 shrink-0", className)}
      fill="none"
      aria-hidden
    >
      <path
        d="M6.5 27.5V4.5h5.6l9.8 14.2V4.5h5.6v23h-5.6L12.1 13.3v14.2H6.5Z"
        fill={`url(#${gradientId})`}
      />
      <defs>
        <linearGradient id={gradientId} x1="7" y1="4" x2="27" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4B5FD" />
          <stop offset="0.5" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact ? (
        <span className="text-[17px] font-semibold tracking-[-0.03em] text-fg">Nearvora</span>
      ) : null}
    </span>
  );
}
