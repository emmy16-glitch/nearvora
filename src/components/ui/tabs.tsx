"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
              active
                ? "bg-surface-3 text-fg shadow-sm"
                : "text-muted hover:text-fg",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="rounded-full bg-surface-3 px-1.5 text-[10px] text-muted">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
