"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ReceiptText, Smartphone, Wifi, Zap } from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import { postJson, issueMessage } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import type { Bill, PortfolioSnapshot, TransactionPlan } from "@/lib/types/domain";
import { formatNgn } from "@/lib/money/format";
import { toMinor } from "@/lib/money/money";
import { PageHeader, Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { PageSkeleton, ErrorState, EmptyState } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlanReviewModal } from "@/components/transactions/plan-review";

type Category = "electricity" | "airtime" | "data";

const categories: { value: Category; label: string; icon: typeof Zap }[] = [
  { value: "electricity", label: "Electricity", icon: Zap },
  { value: "airtime", label: "Airtime", icon: Smartphone },
  { value: "data", label: "Mobile data", icon: Wifi },
];

const quickAmounts: Record<Category, string[]> = {
  electricity: [],
  airtime: ["500", "1000", "2000", "5000"],
  data: ["1000", "2000", "5000", "10000"],
};

function BillsClient() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const bills = useApi<Bill[]>("/api/bills");
  const portfolio = useApi<PortfolioSnapshot>("/api/wallets");

  const paramCategory = searchParams.get("category") as Category | null;
  const [category, setCategory] = React.useState<Category>(
    paramCategory && categories.some((item) => item.value === paramCategory)
      ? paramCategory
      : "electricity",
  );
  const [selectedId, setSelectedId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [plan, setPlan] = React.useState<TransactionPlan | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);

  const filtered = (bills.data ?? []).filter((bill) => bill.category === category);
  const selected = filtered.find((bill) => bill.id === selectedId) ?? filtered[0];

  React.useEffect(() => {
    setSelectedId(filtered[0]?.id ?? "");
    setAmount(filtered[0]?.outstanding ? fromMinorSafe(filtered[0].outstanding) : "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, bills.data]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!selected) {
      setError("Choose a saved bill");
      return;
    }
    if (!amount.trim() || !/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      setError("Enter a valid Naira amount");
      return;
    }
    const amountMinor = toMinor(amount.trim(), 2);
    if (BigInt(amountMinor) <= 0n) {
      setError("Amount must be greater than zero");
      return;
    }
    if (BigInt(amountMinor) + 10000n > BigInt(portfolio.data?.nairaAvailable ?? "0")) {
      setError("Insufficient Naira balance for this payment and fee.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await postJson<TransactionPlan>("/api/plans", {
        title: `${selected.provider} payment`,
        operations: [
          {
            kind: "bill_payment",
            billId: selected.id,
            amount: amount.trim(),
          },
        ],
        idempotencyKey: crypto.randomUUID(),
      });
      setPlan(created);
      setReviewOpen(true);
    } catch (caught) {
      setError(issueMessage(caught));
      toast({ title: "Could not prepare payment", description: issueMessage(caught), variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (bills.loading && !bills.data) return <PageSkeleton />;
  if (bills.error && !bills.data) {
    return (
      <ErrorState
        title="Bills could not be loaded"
        message={bills.error.message}
        onRetry={() => bills.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> Home
      </Link>

      <PageHeader
        eyebrow="Everyday services"
        title="Bills & utilities"
        description="Airtime, mobile data and electricity demo flows. Saved bills come from seeded demo data; no biller is contacted."
        action={<Badge variant="warning">Demo billers</Badge>}
      />

      <Tabs
        value={category}
        onChange={(value) => {
          setCategory(value);
          setNote("");
        }}
        tabs={categories.map((item) => ({ value: item.value, label: item.label }))}
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          {filtered.length === 0 ? (
            <EmptyState
              title={`No saved ${category} bill`}
              description="This demo profile has no saved bill for this category yet."
              icon={<ReceiptText className="size-4" />}
            />
          ) : (
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div>
                <p className="mb-2 text-xs font-medium text-muted">Choose a saved bill</p>
                <div className="space-y-2">
                  {filtered.map((bill) => (
                    <button
                      key={bill.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(bill.id);
                        setAmount(bill.outstanding ? fromMinorSafe(bill.outstanding) : "");
                        setError(null);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                        selected?.id === bill.id
                          ? "border-accent/40 bg-accent/[0.04]"
                          : "border-line bg-surface hover:bg-surface-2"
                      }`}
                    >
                      <span className="grid size-8 place-items-center rounded-lg bg-surface-2 text-muted">
                        {category === "electricity" ? (
                          <Zap className="size-3.5" />
                        ) : category === "data" ? (
                          <Wifi className="size-3.5" />
                        ) : (
                          <Smartphone className="size-3.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-fg">{bill.provider}</span>
                        <span className="block text-[10.5px] text-muted-2">
                          {bill.nickname} · {bill.accountReference}
                        </span>
                      </span>
                      {bill.outstanding ? (
                        <span className="font-mono text-[10px] text-muted">
                          due {formatNgn(bill.outstanding)}
                        </span>
                      ) : null}
                      {selected?.id === bill.id ? <Check className="size-4 text-accent" /> : null}
                    </button>
                  ))}
                </div>
              </div>

              {quickAmounts[category].length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted">Quick amounts</p>
                  <div className="grid grid-cols-4 gap-2">
                    {quickAmounts[category].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAmount(value)}
                        className={`rounded-lg border py-2 text-[11px] font-medium transition-colors ${
                          amount === value
                            ? "border-accent/40 bg-accent/[0.06] text-accent"
                            : "border-line bg-surface text-muted hover:text-fg"
                        }`}
                      >
                        {formatNgn(toMinor(value, 2), { compact: true })}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <Input
                label="Amount (NGN)"
                inputMode="decimal"
                placeholder="0.00"
                prefix="₦"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                error={error ?? undefined}
                hint={
                  selected?.outstanding
                    ? `Outstanding demo balance ${formatNgn(selected.outstanding)}`
                    : "Enter the amount you want to pay"
                }
              />

              <Textarea
                label="Note (optional)"
                placeholder="e.g. October top-up"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={140}
                className="min-h-20"
              />

              <div className="rounded-xl border border-line bg-surface p-3.5">
                <Line label="Payment amount" value={formatNgn(amount && /^\d+(\.\d{1,2})?$/.test(amount) ? toMinor(amount, 2) : "0")} />
                <Line label="Service fee" value={formatNgn("10000")} />
                <Line
                  label="Total debit"
                  value={formatNgn(
                    ((amount && /^\d+(\.\d{1,2})?$/.test(amount) ? BigInt(toMinor(amount, 2)) : 0n) + 10000n).toString(),
                  )}
                  strong
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={submitting} disabled={!selected}>
                  <ReceiptText className="size-4" /> Review payment
                </Button>
              </div>
            </form>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-fg">Bill details</h3>
            {selected ? (
              <div className="mt-4 space-y-3">
                <Line label="Biller" value={selected.provider} />
                <Line label="Nickname" value={selected.nickname} />
                <Line label="Reference" value={selected.accountReference} />
                <Line
                  label="Outstanding"
                  value={selected.outstanding ? formatNgn(selected.outstanding) : "No fixed balance"}
                />
                <Line label="Provider mode" value="Demo · not contacted" />
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-muted">Select a saved bill to see details.</p>
            )}
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-surface-2 p-3">
              <ReceiptText className="mt-0.5 size-3.5 shrink-0 text-teal" />
              <p className="text-[10px] leading-4 text-muted">
                Bill payment execution is simulated. In a live deployment, a provider adapter would
                verify the bill and settle through an approved biller network.
              </p>
            </div>
          </Card>
          <DemoNotice>
            No airtime, data bundle or electricity token is delivered in demo mode.
          </DemoNotice>
        </div>
      </div>

      <PlanReviewModal
        plan={plan}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onExecuted={(executed) => {
          setPlan(executed);
          void bills.refetch({ quiet: true });
          void portfolio.refetch({ quiet: true });
        }}
      />
    </div>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-[11px] text-muted">{label}</span>
      <span className={`font-mono text-[11px] ${strong ? "font-semibold text-fg" : "text-fg"}`}>
        {value}
      </span>
    </div>
  );
}

function fromMinorSafe(minor: string): string {
  return (Number(minor) / 100).toFixed(2);
}

export default function BillsPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <BillsClient />
    </React.Suspense>
  );
}
