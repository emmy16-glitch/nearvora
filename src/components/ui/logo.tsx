import { cn } from "@/lib/utils/cn";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-ink shadow-[0_0_0_1px_rgba(255,255,255,0.15)_inset]">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
          <path
            d="M6.5 18V6l11 12V6"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact ? (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-fg">Nearvora</span>
      ) : null}
    </span>
  );
}
