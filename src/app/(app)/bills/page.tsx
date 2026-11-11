"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { apiFetch, postJson, issueMessage } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import { formatNgn } from "@/lib/money/format";
import { toMinor } from "@/lib/money/money";
import { PageHeader, Card } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Category = { id: number; name: string; code: string };
type Biller = { biller_code: string; name: string; short_name?: string };
type Item = {
  item_code: string;
  name: string;
  short_name?: string;
  label_name?: string;
  amount?: number | string;
  fee?: number | string;
  is_resolvable?: boolean;
};
function BillsClient() {
  const { toast } = useToast();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [billers, setBillers] = React.useState<Biller[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [categoryCode, setCategoryCode] = React.useState("");
  const [billerCode, setBillerCode] = React.useState("");
  const [itemCode, setItemCode] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<unknown>(null);

  const selectedItem = items.find((item) => item.item_code === itemCode);

  React.useEffect(() => {
    let active = true;
    apiFetch<Category[]>("/api/payments/flutterwave?resource=categories")
      .then((response) => {
        if (!active) return;
        setCategories(response ?? []);
        setCategoryCode(response?.[0]?.code ?? "");
        setError(null);
      })
      .catch((caught) => { if (active) setError(issueMessage(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    if (!categoryCode) { setBillers([]); setBillerCode(""); return; }
    let active = true;
    setBillers([]); setItems([]); setBillerCode(""); setItemCode(""); setError(null); setResult(null);
    apiFetch<Biller[]>(`/api/payments/flutterwave?resource=billers&categoryCode=${encodeURIComponent(categoryCode)}`)
      .then((response) => {
        if (!active) return;
        setBillers(response ?? []);
        setBillerCode(response?.[0]?.biller_code ?? "");
      })
      .catch((caught) => { if (active) setError(issueMessage(caught)); });
    return () => { active = false; };
  }, [categoryCode]);

  React.useEffect(() => {
    if (!billerCode) { setItems([]); setItemCode(""); return; }
    let active = true;
    setItems([]); setItemCode(""); setCustomerId(""); setAmount(""); setError(null); setResult(null);
    apiFetch<Item[]>(`/api/payments/flutterwave?resource=items&billerCode=${encodeURIComponent(billerCode)}`)
      .then((response) => {
        if (!active) return;
        setItems(response ?? []);
        const first = response?.[0];
        setItemCode(first?.item_code ?? "");
        if (first?.amount !== undefined && Number(first.amount) > 0) setAmount(String(first.amount));
      })
      .catch((caught) => { if (active) setError(issueMessage(caught)); });
    return () => { active = false; };
  }, [billerCode]);

  React.useEffect(() => {
    if (!selectedItem) return;
    setCustomerId("");
    setAmount(selectedItem.amount !== undefined && Number(selectedItem.amount) > 0 ? String(selectedItem.amount) : "");
    setResult(null);
  }, [selectedItem, itemCode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null); setResult(null);
    if (!categoryCode || !billerCode || !selectedItem) { setError("Choose a category, biller and service item."); return; }
    if (!customerId.trim()) { setError(`Enter ${selectedItem.label_name || "customer identifier"}.`); return; }
    if (!amount.trim() || !/^\d+(\.\d{1,2})?$/.test(amount.trim()) || BigInt(toMinor(amount.trim(), 2)) <= 0n) {
      setError("Enter a valid amount greater than zero."); return;
    }
    setSubmitting(true);
    try {
      let validatedText = "This service does not require Flutterwave customer validation.";
      if (selectedItem.is_resolvable) {
        const validation = await postJson<{ response_code?: string; response_message?: string }>("/api/payments/flutterwave", {
          operation: "validate_bill", itemCode, customerId: customerId.trim(),
        });
        if (validation.response_code !== "00") {
          throw new Error(validation.response_message || "Flutterwave could not validate this customer identifier.");
        }
        validatedText = JSON.stringify(validation, null, 2);
      }
      if (!window.confirm(`Flutterwave TEST/SANDBOX purchase confirmation\n\n${selectedItem.name}\nCustomer: ${customerId.trim()}\nAmount: ${formatNgn(toMinor(amount.trim(), 2))}\n\nValidation response:\n${validatedText}\n\nContinue with this sandbox bill purchase?`)) return;
      const payment = await postJson<unknown>("/api/payments/flutterwave", {
        operation: "bill_payment", billerCode, itemCode, customerId: customerId.trim(),
        amountMinor: toMinor(amount.trim(), 2), reference: `bill_${crypto.randomUUID()}`,
      });
      setResult(payment);
      toast({ title: "Flutterwave sandbox response received", description: "Review the provider response below." });
    } catch (caught) {
      setError(issueMessage(caught));
      toast({ title: "Flutterwave bill request failed", description: issueMessage(caught), variant: "error" });
    } finally { setSubmitting(false); }
  };

  if (loading) return <PageSkeleton />;
  const chosenBiller = billers.find((biller) => biller.biller_code === billerCode);
  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg">
        <ArrowLeft className="size-3.5" /> Home
      </Link>
      <PageHeader eyebrow="Flutterwave bill services" title="Bills & utilities" description="Bill lookup and payment through Flutterwave TEST/SANDBOX. This is not a live purchase and does not use demo wallet funds." action={<Badge variant="warning">TEST / SANDBOX</Badge>} />
      <Card className="max-w-2xl p-5 sm:p-6">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <label className="block space-y-1.5 text-xs font-medium text-muted">Service category
            <select className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-fg" value={categoryCode} onChange={(event) => setCategoryCode(event.target.value)}>
              {categories.map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-xs font-medium text-muted">Biller
            <select className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-fg" value={billerCode} onChange={(event) => setBillerCode(event.target.value)}>
              {billers.map((biller) => <option key={biller.biller_code} value={biller.biller_code}>{biller.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-xs font-medium text-muted">Service
            <select className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-fg" value={itemCode} onChange={(event) => setItemCode(event.target.value)}>
              {items.map((item) => <option key={item.item_code} value={item.item_code}>{item.name}{item.amount && Number(item.amount) > 0 ? ` · ${formatNgn(toMinor(String(item.amount), 2))}` : ""}</option>)}
            </select>
          </label>
          {selectedItem && <Input label={selectedItem.label_name || "Customer identifier"} value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder={`Enter ${selectedItem.label_name || "customer identifier"}`} />}
          <Input label="Amount (NGN)" inputMode="decimal" prefix="₦" value={amount} onChange={(event) => setAmount(event.target.value)} hint={selectedItem?.amount && Number(selectedItem.amount) > 0 ? "Amount provided by Flutterwave for this item." : "Enter amount for this service."} />
          {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/[0.04] p-3 text-xs text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit" loading={submitting} disabled={!categoryCode || !billerCode || !itemCode || !customerId.trim()}><ReceiptText className="size-4" /> Validate &amp; continue</Button></div>
        </form>
        {categories.length === 0 && !error && <p className="mt-4 text-xs text-muted">No categories are currently available.</p>}
        {chosenBiller && <p className="mt-4 text-[11px] text-muted">Selected biller: {chosenBiller.short_name || chosenBiller.name} · TEST/SANDBOX only</p>}
      </Card>
      {result !== null && <Card className="max-w-2xl space-y-3 p-5"><h2 className="text-sm font-semibold text-fg">Flutterwave provider response</h2><p className="text-xs text-muted">Provider response received; check its status and details below. No success is assumed from submission alone.</p><pre className="max-h-96 overflow-auto rounded-lg bg-surface-2 p-3 text-[11px] text-fg">{JSON.stringify(result, null, 2)}</pre></Card>}
    </div>
  );
}

export default function BillsPage() {
  return <React.Suspense fallback={<PageSkeleton />}><BillsClient /></React.Suspense>;
}
