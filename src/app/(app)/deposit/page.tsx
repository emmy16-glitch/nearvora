"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowLeft, Building2, Landmark, ShieldCheck } from "lucide-react";
import { postJson, issueMessage } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import { formatNgn, formatDateTime } from "@/lib/money/format";
import { toMinor } from "@/lib/money/money";
import { PageHeader, Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

interface DepositCharge {
  reference: string;
  charge: {
    transfer_account: string;
    transfer_bank: string;
    transfer_amount?: string | number;
    account_expiration?: string;
    transfer_note?: string;
  };
}

const chips = ["10000", "25000", "50000", "100000"];

export default function DepositPage() {
  const { toast } = useToast();
  const [amount, setAmount] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [charge, setCharge] = React.useState<DepositCharge | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setCharge(null);
    const trimmedAmount = amount.trim();
    if (!trimmedAmount || !/^\d+(\.\d{1,2})?$/.test(trimmedAmount)) {
      setError("Enter a valid Naira amount");
      return;
    }
    if (BigInt(toMinor(trimmedAmount, 2)) <= 0n) {
      setError("Deposit amount must be greater than zero");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    if (fullName.trim().length < 2) {
      setError("Enter your full name");
      return;
    }
    if (phoneNumber.trim().length < 8 || phoneNumber.trim().length > 20) {
      setError("Enter a valid phone number");
      return;
    }
    setSubmitting(true);
    try {
      const created = await postJson<DepositCharge>("/api/payments/flutterwave", {
        operation: "create_deposit",
        amountMinor: toMinor(trimmedAmount, 2),
        email: email.trim(),
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      setCharge(created);
    } catch (caught) {
      const message = issueMessage(caught);
      setError(message);
      toast({ title: "Could not create sandbox transfer", description: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const exactAmount = charge?.charge.transfer_amount == null
    ? formatNgn(toMinor(amount.trim() || "0", 2))
    : formatNgn(toMinor(String(charge.charge.transfer_amount), 2));

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg">
        <ArrowLeft className="size-3.5" /> Home
      </Link>

      <PageHeader
        eyebrow="Add money"
        title="Deposit Naira"
        description="Create a one-off bank-transfer charge using the Flutterwave test sandbox. This does not credit your Nearvora wallet."
        action={<Badge variant="warning">TEST / SANDBOX ONLY</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            <Input label="Full name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" />
            <Input label="Phone number" type="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="e.g. 08012345678" />
            <div>
              <p className="mb-2 text-xs font-medium text-muted">Choose an amount</p>
              <div className="grid grid-cols-4 gap-2">
                {chips.map((chip) => (
                  <button key={chip} type="button" onClick={() => setAmount(chip)} className={`rounded-lg border py-2 text-[11px] font-medium transition-colors ${amount === chip ? "border-accent/40 bg-accent/[0.06] text-accent" : "border-line bg-surface text-muted hover:text-fg"}`}>
                    {formatNgn(toMinor(chip, 2), { compact: true })}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Amount (NGN)" inputMode="decimal" placeholder="0.00" prefix="₦" value={amount} onChange={(event) => setAmount(event.target.value)} error={error ?? undefined} hint="A test-mode bank-transfer charge will be requested; no wallet credit is made." />
            <div className="flex justify-end">
              <Button type="submit" loading={submitting}><ArrowDownToLine className="size-4" /> Create test transfer</Button>
            </div>
          </form>

          <div className="mt-5 rounded-xl border border-warning/30 bg-surface-2/60 p-4">
            <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-warning" /><p className="text-[11px] font-medium text-fg">TEST / SANDBOX FLOW — NOT A WALLET DEPOSIT</p></div>
            <p className="mt-2 text-[10.5px] leading-4 text-muted">The returned bank details are for a one-off Flutterwave sandbox charge only. They are not live payment instructions. A provider response is not proof of settlement, does not credit your Nearvora wallet, and is not recorded as a transaction or ledger entry.</p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2"><Building2 className="size-4 text-muted" /><h3 className="text-sm font-semibold text-fg">Sandbox transfer details</h3></div>
            {!charge ? (
              <p className="mt-4 text-[11px] leading-5 text-muted">Submit the form to request one-off test bank-transfer details. No demo account details are substituted if the sandbox is unavailable.</p>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  <Detail label="Bank" value={charge.charge.transfer_bank} />
                  <Detail label="Account number" value={charge.charge.transfer_account} mono />
                  <Detail label="Exact amount" value={exactAmount} mono />
                  <Detail label="Expiry" value={charge.charge.account_expiration ? formatDateTime(charge.charge.account_expiration) : "Not provided"} />
                  <Detail label="Reference" value={charge.reference} mono />
                  {charge.charge.transfer_note && <Detail label="Transfer note" value={charge.charge.transfer_note} />}
                </div>
                <div className="mt-3"><CopyButton value={charge.charge.transfer_account} label="Copy account number" /></div>
                <p className="mt-3 text-[9.5px] leading-4 text-warning/90">TEST ONLY. This result does not represent a completed payment or wallet credit.</p>
              </>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2"><Landmark className="size-4 text-muted" /><h3 className="text-sm font-semibold text-fg">Sandbox operation</h3></div>
            <div className="mt-3 space-y-2.5"><Detail label="Mode" value="TEST" /><Detail label="Operation" value="One-off transfer charge" /><Detail label="Wallet credit" value="None" /></div>
            <p className="mt-3 text-[10px] text-muted-2">Only use these details in a test environment. Provider charge creation does not create a Nearvora transaction or ledger entry.</p>
          </Card>
        </div>
      </div>

    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-muted">{label}</span>
      <span className={`text-right text-[11px] font-medium text-fg ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
