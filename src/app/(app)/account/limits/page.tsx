"use client";

import { Gauge } from "lucide-react";
import { formatNgn } from "@/lib/money/format";
import { AccountScreen } from "@/components/account/account-shell";

const limits = [
  { label: "Daily transfer", used: 85000000, limit: 500000000 },
  { label: "Monthly transfer", used: 1240000000, limit: 5000000000 },
  { label: "Single transaction", used: 0, limit: 1000000000 },
  { label: "Crypto withdrawal (24h)", used: 35000000, limit: 200000000 },
];

export default function LimitsPage() {
  return (
    <AccountScreen title="Spending Limits" action={<Gauge className="size-5 text-muted-2" />}>
      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-fg">Your limits</h2>
          <span className="rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-success">
            Tier 2
          </span>
        </div>
        <div className="mt-4 space-y-4">
          {limits.map((item) => {
            const percent = Math.min(100, Math.round((item.used / item.limit) * 100));
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-3 text-[11.5px]">
                  <span className="text-muted">{item.label}</span>
                  <span className="font-mono text-fg">
                    {formatNgn(String(item.used))} / {formatNgn(String(item.limit))}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${percent}%` }}
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={item.label}
                  />
                </div>
                <p className="mt-1 text-[9.5px] text-muted-2">{percent}% used</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-fg">How limits work</h2>
        <ul className="mt-2.5 space-y-2 text-[10.5px] leading-4 text-muted">
          <li>• Limits apply across transfers, withdrawals and conversions.</li>
          <li>• Higher verification tiers unlock larger limits.</li>
          <li>• A backend check enforces limits even if the UI is bypassed.</li>
          <li>• Limits reset on a rolling 24-hour and calendar-month basis.</li>
        </ul>
        <p className="mt-3 text-[9.5px] text-muted-2">
          Values shown are demonstration values and are not financial commitments.
        </p>
      </section>
    </AccountScreen>
  );
}
