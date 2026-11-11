"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Landmark } from "lucide-react";
import { apiFetch, postJson, issueMessage } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import { formatNgn } from "@/lib/money/format";
import { toMinor } from "@/lib/money/money";
import { PageHeader, Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Bank = { code: string; name: string };
type Resolution = { account_number: string; account_name: string };
type PayoutResult = { id?: string | number; status?: string; reference?: string; [key: string]: unknown };

export default function WithdrawPage() {
  const { toast } = useToast();
  const [banks, setBanks] = React.useState<Bank[]>([]);
  const [bankCode, setBankCode] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [banksLoading, setBanksLoading] = React.useState(true);
  const [resolving, setResolving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [setupError, setSetupError] = React.useState("");
  const [resolved, setResolved] = React.useState<Resolution | null>(null);
  const [result, setResult] = React.useState<PayoutResult | null>(null);
  const bank = banks.find((item) => item.code === bankCode);

  React.useEffect(() => {
    let active = true;
    apiFetch<Bank[]>("/api/payments/flutterwave?resource=banks")
      .then((list) => {
        if (!active) return;
        setBanks(list);
        setBankCode(list[0]?.code ?? "");
      })
      .catch((error) => { if (active) setSetupError(issueMessage(error)); })
      .finally(() => { if (active) setBanksLoading(false); });
    return () => { active = false; };
  }, []);

  const resolveAccount = async () => {
    setSetupError("");
    setResolved(null);
    setResult(null);
    if (!/^\d{10}$/.test(accountNumber) || !bankCode) {
      setSetupError("Choose a bank and enter a 10-digit account number.");
      return;
    }
    setResolving(true);
    try {
      const resolution = await postJson<Resolution>("/api/payments/flutterwave", {
        operation: "resolve_account", accountNumber, bankCode,
      });
      if (resolution.account_number !== accountNumber || !resolution.account_name) {
        throw new Error("Flutterwave did not return a matching, named account.");
      }
      setResolved(resolution);
      toast({ title: "Account verified", description: resolution.account_name });
    } catch (error) {
      const message = issueMessage(error);
      setSetupError(message);
      toast({ title: "Account lookup failed", description: message, variant: "error" });
    } finally {
      setResolving(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSetupError("");
    setResult(null);
    if (!resolved) {
      setSetupError("Resolve and verify the account before requesting a test payout.");
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || BigInt(toMinor(amount.trim(), 2)) <= 0n) {
      setSetupError("Enter a valid amount greater than zero.");
      return;
    }
    const amountMinor = toMinor(amount.trim(), 2);
    const confirmed = window.confirm(
      `TEST/SANDBOX payout confirmation\n\nRecipient: ${resolved.account_name}\nAccount: ${resolved.account_number}\nBank: ${bank?.name ?? bankCode}\nAmount: ${formatNgn(amountMinor)}\n\nSend this test-mode payout request? No real funds will be sent.`,
    );
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const payout = await postJson<PayoutResult>("/api/payments/flutterwave", {
        operation: "payout",
        amountMinor,
        accountNumber: resolved.account_number,
        bankCode,
        reference: `wd_${crypto.randomUUID().replace(/-/g, "").slice(0, 28)}`,
        narration: "TEST/SANDBOX withdrawal",
      });
      setResult(payout);
      toast({ title: "Sandbox payout response received", description: "Review the provider status below." });
    } catch (error) {
      const message = issueMessage(error);
      setSetupError(message);
      toast({ title: "Sandbox payout failed", description: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const amountMinor = /^\d+(\.\d{1,2})?$/.test(amount.trim()) ? toMinor(amount.trim(), 2) : "0";

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg">
        <ArrowLeft className="size-3.5" /> Home
      </Link>
      <PageHeader
        eyebrow="Withdraw · TEST/SANDBOX"
        title="Test bank payout"
        description="Submit a Flutterwave sandbox payout only. This does not use or update Nearvora wallet balances."
        action={<Badge variant="warning">TEST / SANDBOX ONLY</Badge>}
      />
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5 sm:p-6">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Select label="Bank · TEST/SANDBOX" value={bankCode} onChange={(event) => { setBankCode(event.target.value); setResolved(null); setResult(null); }} disabled={banksLoading || banks.length === 0}>
              {banksLoading ? <option value="">Loading banks…</option> : banks.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </Select>
            <Input label="Account number" inputMode="numeric" maxLength={10} value={accountNumber} onChange={(event) => { setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10)); setResolved(null); setResult(null); }} />
            <div className="flex justify-end">
              <Button type="button" loading={resolving} onClick={() => void resolveAccount()} disabled={banksLoading || !banks.length || accountNumber.length !== 10}>
                <Check className="size-4" /> Resolve account name
              </Button>
            </div>
            {resolved && <div className="rounded-xl border border-accent/30 bg-accent/[0.04] p-3.5 text-xs"><p className="font-semibold text-fg">Verified recipient: {resolved.account_name}</p><p className="mt-1 text-muted">{resolved.account_number} · {bank?.name}</p></div>}
            <Input label="Amount (NGN) · TEST/SANDBOX" inputMode="decimal" placeholder="0.00" prefix="₦" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <div className="rounded-xl border border-line bg-surface p-3.5"><Line label="Test payout amount" value={formatNgn(amountMinor)} /><p className="mt-2 text-[10px] leading-4 text-muted-2">Sandbox request only. Seeded demo balances are not payout funding; this action does not claim or apply a wallet balance change.</p></div>
            {setupError && <ErrorState title="Sandbox setup or request error" message={setupError} />}
            <div className="flex justify-end"><Button type="submit" loading={submitting} disabled={!resolved || !amount.trim()}><ArrowUpRight className="size-4" /> Confirm TEST payout</Button></div>
          </form>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2"><Landmark className="size-4 text-muted" /><h3 className="text-sm font-semibold text-fg">Sandbox payout</h3></div>
            <div className="mt-4 space-y-3"><Line label="Mode" value="TEST" /><Line label="Recipient" value={resolved?.account_name ?? "Not verified"} /><Line label="Bank" value={bank?.name ?? "—"} /><Line label="Account" value={resolved?.account_number ?? "—"} /><Line label="Amount" value={formatNgn(amountMinor)} /></div>
            <p className="mt-4 text-[10px] leading-4 text-muted-2">The server resolves the account again before sending the test request. You must confirm the recipient immediately before submission.</p>
          </Card>
          {banksLoading && <p className="text-xs text-muted">Loading Flutterwave sandbox bank list…</p>}
          {result && <Card className="p-5"><h3 className="text-sm font-semibold text-fg">Provider result · TEST/SANDBOX</h3><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[10px] text-muted">{JSON.stringify(result, null, 2)}</pre><p className="mt-3 text-[10px] text-muted-2">Provider response only; no wallet balance or activity entry was changed by this screen.</p></Card>}
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 py-0.5"><span className="text-[11px] text-muted">{label}</span><span className="font-mono text-[11px] text-fg">{value}</span></div>;
}
