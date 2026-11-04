"use client";

import { BadgeCheck, Check, FileText, ShieldCheck } from "lucide-react";
import { useSession } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { AccountScreen, InfoRow } from "@/components/account/account-shell";

const steps = [
  { label: "Identity details", complete: true },
  { label: "BVN verification", complete: true },
  { label: "Government-issued ID", complete: true },
  { label: "Facial verification", complete: true },
  { label: "Address verification", complete: true },
];

export default function KycPage() {
  const { user } = useSession();
  const verified = user.kycStatus === "verified";

  return (
    <AccountScreen
      title="KYC Verification"
      action={<ShieldCheck className="size-5 text-muted-2" />}
      demoText="Verification here is simulated. No identity documents were submitted or checked."
    >
      <section className="rounded-2xl border border-success/25 bg-success/[0.06] p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-success/15 text-success">
            <BadgeCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-fg">
              {verified ? "Identity verified" : "Verification pending"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {verified
                ? "Tier 2 verification · full wallet access"
                : "Complete verification to unlock full access"}
            </p>
          </div>
          <Badge variant={verified ? "success" : "warning"}>
            {verified ? "Verified" : "Pending"}
          </Badge>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-fg">Verification checklist</h2>
        <ul className="mt-3 space-y-2.5">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-3">
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-full ${
                  step.complete ? "bg-success/15 text-success" : "bg-surface-3 text-muted-2"
                }`}
              >
                <Check className="size-3" />
              </span>
              <span className="flex-1 text-[11.5px] text-fg">{step.label}</span>
              <span className="text-[9.5px] uppercase tracking-wider text-success">Complete</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-fg">Account details</h2>
        <div className="mt-2">
          <InfoRow label="Verification tier" value="Tier 2" />
          <InfoRow label="Daily limit" value="₦5,000,000.00" />
          <InfoRow label="Monthly limit" value="₦50,000,000.00" />
          <InfoRow label="Document type" value="Not stored in demo" />
          <InfoRow label="Status" value="Verified (simulated)" />
        </div>
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
        <FileText className="mt-0.5 size-4 shrink-0 text-lavender" />
        <p className="text-[10.5px] leading-4 text-muted">
          In production, documents are encrypted at rest, access is restricted, and only
          verification results are retained. Before launch, complete the applicable Nigerian
          regulatory review.
        </p>
      </section>
    </AccountScreen>
  );
}
