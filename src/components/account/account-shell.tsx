import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { DemoNotice } from "@/components/ui/demo-notice";

export function AccountScreen({
  title,
  children,
  backHref = "/account",
  action,
  demo = true,
  demoText,
}: {
  title: string;
  children: ReactNode;
  backHref?: string;
  action?: ReactNode;
  demo?: boolean;
  demoText?: string;
}) {
  return (
    <div className="space-y-5 pb-2">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          aria-label="Go back"
          className="grid size-10 place-items-center rounded-full text-fg transition-colors hover:bg-surface-2"
        >
          <ArrowUpDown className="size-5 rotate-90" />
        </Link>
        <h1 className="text-center text-[17px] font-semibold tracking-tight text-fg sm:text-lg">
          {title}
        </h1>
        <div className="flex size-10 items-center justify-center">{action}</div>
      </header>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {children}
        {demo ? (
          <DemoNotice>
            {demoText ??
              "This is a demo profile. Changes and values are simulated and do not affect a real account."}
          </DemoNotice>
        ) : null}
      </div>
    </div>
  );
}

export function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line py-3 last:border-b-0">
      <span className="text-[11.5px] text-muted">{label}</span>
      <span
        className={`max-w-[62%] text-right text-[11.5px] font-medium text-fg ${
          mono ? "break-all font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
