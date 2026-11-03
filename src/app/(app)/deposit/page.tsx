"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowLeft, Building2, Landmark, ShieldCheck } from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import { postJson, issueMessage } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import type { PortfolioSnapshot, Transaction, TransactionPlan } from "@/lib/types/domain";
import { formatNgn, formatDateTime } from "@/lib/money/format";
import { toMinor } from "@/lib/money/money";
import { PageHeader, Card, SectionHeading } from "@/components/ui/card";
import { PageSkeleton, Skeleton } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { PlanReviewModal } from "@/components/transactions/plan-review";

interface VirtualAccount {
  provider: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  simulated: boolean;
  note: string;
}

const chips = ["10000", "25000", "50000", "100000"];

export default function DepositPage() {
  const { toast } = useToast();
  const portfolio = useApi<PortfolioSnapshot>("/api/wallets");
  const account = useApi<VirtualAccount>("/api/payments/virtual-account");
  const transactions = useApi<Transaction[]>("/api/transactions?limit=20");

  const [amount, setAmount] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [plan, setPlan] = React.useState<TransactionPlan | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!amount.trim() || !/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      setError("Enter a valid Naira amount");
      return;
    }
    if (BigInt(toMinor(amount.trim(), 2)) <= 0n) {
      setError("Deposit amount must be greater than zero");
      return;
    }
    setSubmitting(true);
    try {
      const created = await postJson<TransactionPlan>("/api/plans", {
        title: "Demo Naira deposit",
        operations: [{ kind: "cash_deposit", amount: amount.trim() }],
        idempotencyKey: crypto.randomUUID(),
      });
      setPlan(created);
      setReviewOpen(true);
    } catch (caught) {
      setError(issueMessage(caught));
      toast({ title: "Could not prepare deposit", description: issueMessage(caught), variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (portfolio.loading && !portfolio.data) return <PageSkeleton />;

  const recentDeposits = (transactions.data ?? []).filter((item) => item.type === "deposit");

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> Home
      </Link>

      <PageHeader
        eyebrow="Add money"
        title="Deposit Naira"
        description="Use the demo virtual account below. Approving the deposit credits your simulated Naira wallet — no real bank transfer takes place."
        action={<Badge variant="warning">Demo deposits</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted">
                Naira available
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-fg">
                {formatNgn(portfolio.data?.nairaAvailable ?? "0")}
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl border border-success/25 bg-success/10 text-success">
              <ArrowDownToLine className="size-4" />
            </span>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">Choose an amount</p>
              <div className="grid grid-cols-4 gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setAmount(chip)}
                    className={`rounded-lg border py-2 text-[11px] font-medium transition-colors ${
                      amount === chip
                        ? "border-accent/40 bg-accent/[0.06] text-accent"
                        : "border-line bg-surface text-muted hover:text-fg"
                    }`}
                  >
                    {formatNgn(toMinor(chip, 2), { compact: true })}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Amount (NGN)"
              inputMode="decimal"
              placeholder="0.00"
              prefix="₦"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={error ?? undefined}
              hint="Deposits are credited only after demo approval."
            />

            <div className="flex justify-end">
              <Button type="submit" loading={submitting}>
                <ArrowDownToLine className="size-4" /> Review demo deposit
              </Button>
            </div>
          </form>

          <div className="mt-5 rounded-xl border border-line bg-surface-2/60 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" />
              <p className="text-[11px] font-medium text-fg">How demo deposits work</p>
            </div>
            <ol className="mt-2 space-y-1.5 text-[10.5px] leading-4 text-muted">
              <li>1. The virtual account below is a clearly labelled demo account.</li>
              <li>2. Enter an amount and review the deposit plan.</li>
              <li>3. Approval credits simulated Naira and creates an audit record.</li>
              <li>4. No webhook, provider settlement or real funds are involved.</li>
            </ol>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted" />
              <h3 className="text-sm font-semibold text-fg">Demo virtual account</h3>
            </div>
            {account.loading ? (
              <Skeleton className="mt-4 h-28 w-full" />
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  <Detail label="Bank" value={account.data?.bankName ?? "Nearvora Demo Bank"} />
                  <Detail label="Account number" value={account.data?.accountNumber ?? "0000000000"} mono />
                  <Detail label="Account name" value={account.data?.accountName ?? "DEMO"} />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-muted">Status</span>
                    <StatusBadge status="pending" />
                  </div>
                </div>
                <div className="mt-3">
                  <CopyButton
                    value={`${account.data?.bankName} / ${account.data?.accountNumber} / ${account.data?.accountName}`}
                    label="Copy account details"
                  />
                </div>
                <p className="mt-3 text-[9.5px] leading-4 text-warning/90">
                  {account.data?.note}
                </p>
              </>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Landmark className="size-4 text-muted" />
              <h3 className="text-sm font-semibold text-fg">Deposit limits</h3>
            </div>
            <div className="mt-3 space-y-2.5">
              <Detail label="Single deposit" value={formatNgn("5000000000")} />
              <Detail label="Daily demo limit" value={formatNgn("50000000000")} />
              <Detail label="Fee" value="₦0.00" />
            </div>
            <p className="mt-3 text-[10px] text-muted-2">
              Limits are demonstration values and may change before live launch.
            </p>
          </Card>
        </div>
      </div>

      <section>
        <SectionHeading title="Recent deposits" />
        {recentDeposits.length === 0 ? (
          <Card className="p-4">
            <p className="py-6 text-center text-xs text-muted">No demo deposits yet.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-line">
            {recentDeposits.slice(0, 5).map((deposit) => (
              <div key={deposit.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[12px] font-medium text-fg">{deposit.title}</p>
                  <p className="text-[10px] text-muted-2">{formatDateTime(deposit.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[11.5px] font-medium text-success">
                    +{formatNgn(deposit.amount)}
                  </p>
                  <StatusBadge status={deposit.status} />
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      <DemoNotice>
        The virtual account number is a reserved demonstration value. Do not send real money to it.
      </DemoNotice>

      <PlanReviewModal
        plan={plan}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onExecuted={(executed) => {
          setPlan(executed);
          setAmount("");
          void portfolio.refetch({ quiet: true });
          void transactions.refetch({ quiet: true });
        }}
      />
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-muted">{label}</span>
      <span className={`text-right text-[11px] font-medium text-fg ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
