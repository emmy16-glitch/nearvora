"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Landmark, UserRound } from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import { postJson, issueMessage } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import type { Beneficiary, PortfolioSnapshot, TransactionPlan } from "@/lib/types/domain";
import { formatNgn } from "@/lib/money/format";
import { toMinor } from "@/lib/money/money";
import { DEMO_BANKS, DEMO_BANK_FEE_KOBO } from "@/lib/config/banks";
import { PageHeader, Card } from "@/components/ui/card";
import { PageSkeleton, ErrorState } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlanReviewModal } from "@/components/transactions/plan-review";

type Mode = "saved" | "new";

export default function WithdrawPage() {
  const { toast } = useToast();
  const portfolio = useApi<PortfolioSnapshot>("/api/wallets");
  const beneficiaries = useApi<Beneficiary[]>("/api/beneficiaries");

  const [mode, setMode] = React.useState<Mode>("saved");
  const [selectedId, setSelectedId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [accountName, setAccountName] = React.useState("");
  const [bankName, setBankName] = React.useState<string>(DEMO_BANKS[6]);
  const [accountNumber, setAccountNumber] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [plan, setPlan] = React.useState<TransactionPlan | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);

  const bankBeneficiaries = (beneficiaries.data ?? []).filter(
    (beneficiary) => beneficiary.type === "bank",
  );
  const selected = bankBeneficiaries.find((item) => item.id === selectedId);
  const available = portfolio.data?.nairaAvailable ?? "0";

  React.useEffect(() => {
    if (!selectedId && bankBeneficiaries[0]) setSelectedId(bankBeneficiaries[0].id);
  }, [bankBeneficiaries, selectedId]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (mode === "saved" && !selectedId) next.recipient = "Choose a withdrawal account";
    if (mode === "new") {
      if (accountName.trim().length < 2) next.accountName = "Enter the account name";
      if (!/^\d{10}$/.test(accountNumber.trim())) next.accountNumber = "Enter a 10-digit account number";
    }
    if (!amount.trim()) next.amount = "Enter an amount";
    else if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) next.amount = "Enter a valid Naira amount";
    else {
      const amountMinor = BigInt(toMinor(amount.trim(), 2));
      if (amountMinor <= 0n) next.amount = "Amount must be greater than zero";
      else if (amountMinor + BigInt(DEMO_BANK_FEE_KOBO) > BigInt(available)) {
        next.amount = `Insufficient Naira. Available ${formatNgn(available)}.`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const created = await postJson<TransactionPlan>("/api/plans", {
        title: "Naira withdrawal",
        operations: [
          {
            kind: "cash_withdrawal",
            amount: amount.trim(),
            ...(mode === "saved"
              ? { beneficiaryId: selectedId }
              : {
                  accountName: accountName.trim(),
                  bankName,
                  accountNumber: accountNumber.trim(),
                }),
          },
        ],
        idempotencyKey: crypto.randomUUID(),
      });
      setPlan(created);
      setReviewOpen(true);
    } catch (caught) {
      toast({ title: "Could not prepare withdrawal", description: issueMessage(caught), variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (portfolio.loading && !portfolio.data) return <PageSkeleton />;
  if (portfolio.error && !portfolio.data) {
    return (
      <ErrorState
        title="Wallet could not be loaded"
        message={portfolio.error.message}
        onRetry={() => portfolio.refetch()}
      />
    );
  }

  const amountMinor = /^\d+(\.\d{1,2})?$/.test(amount.trim()) ? toMinor(amount.trim(), 2) : "0";
  const total = (BigInt(amountMinor) + BigInt(DEMO_BANK_FEE_KOBO)).toString();
  const remaining = (BigInt(available) - BigInt(total)).toString();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> Home
      </Link>

      <PageHeader
        eyebrow="Withdraw"
        title="Withdraw Naira"
        description="Send Naira to a saved or new bank account. Withdrawals are simulated and remain pending until demo settlement."
        action={<Badge variant="warning">Demo withdrawal</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1">
            {(["saved", "new"] as Mode[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`h-8 rounded-lg text-xs font-medium transition-colors ${
                  mode === value ? "bg-surface-3 text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {value === "saved" ? "Saved account" : "New account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === "saved" ? (
              <div>
                <p className="mb-2 text-xs font-medium text-muted">Withdrawal account</p>
                <div className="space-y-2">
                  {bankBeneficiaries.map((beneficiary) => (
                    <button
                      key={beneficiary.id}
                      type="button"
                      onClick={() => setSelectedId(beneficiary.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                        selectedId === beneficiary.id
                          ? "border-accent/40 bg-accent/[0.04]"
                          : "border-line bg-surface hover:bg-surface-2"
                      }`}
                    >
                      <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-muted">
                        <UserRound className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-fg">{beneficiary.name}</span>
                        <span className="block text-[10.5px] text-muted-2">
                          {beneficiary.bankName} ••{beneficiary.accountNumber?.slice(-4)}
                        </span>
                      </span>
                      {selectedId === beneficiary.id ? <Check className="size-4 text-accent" /> : null}
                    </button>
                  ))}
                </div>
                {errors.recipient ? (
                  <p className="mt-1.5 text-xs text-danger">{errors.recipient}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  label="Account name"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  error={errors.accountName}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select label="Bank" value={bankName} onChange={(event) => setBankName(event.target.value)}>
                    {DEMO_BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Account number"
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(event) =>
                      setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    error={errors.accountNumber}
                  />
                </div>
              </div>
            )}

            <Input
              label="Amount (NGN)"
              inputMode="decimal"
              placeholder="0.00"
              prefix="₦"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={errors.amount}
              hint={`Available ${formatNgn(available)}`}
            />

            <div className="rounded-xl border border-line bg-surface p-3.5">
              <Line label="Withdrawal amount" value={formatNgn(amountMinor)} />
              <Line label="Withdrawal fee" value={formatNgn(DEMO_BANK_FEE_KOBO)} />
              <div className="my-2 border-t border-line" />
              <Line label="Total debit" value={formatNgn(total)} strong />
              <Line
                label="Estimated Naira remaining"
                value={formatNgn(remaining.startsWith("-") ? "0" : remaining)}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={submitting}>
                <ArrowUpRight className="size-4" /> Review withdrawal
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Landmark className="size-4 text-muted" />
              <h3 className="text-sm font-semibold text-fg">Withdrawal details</h3>
            </div>
            <div className="mt-4 space-y-3">
              <Line
                label="Recipient"
                value={mode === "saved" ? selected?.name ?? "—" : accountName || "New account"}
              />
              <Line label="Bank" value={mode === "saved" ? selected?.bankName ?? "—" : bankName} />
              <Line
                label="Account"
                value={
                  mode === "saved"
                    ? selected?.accountNumber
                      ? `••••${selected.accountNumber.slice(-4)}`
                      : "—"
                    : accountNumber
                      ? `••••${accountNumber.slice(-4)}`
                      : "—"
                }
              />
              <Line label="Processing" value="Simulated · pending settlement" />
            </div>
            <p className="mt-4 text-[10px] leading-4 text-muted-2">
              Approving a withdrawal creates a pending demo transaction. It does not contact a bank.
            </p>
          </Card>
          <DemoNotice>No real bank settlement occurs in this build.</DemoNotice>
        </div>
      </div>

      <PlanReviewModal
        plan={plan}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onExecuted={(executed) => {
          setPlan(executed);
          setAmount("");
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
