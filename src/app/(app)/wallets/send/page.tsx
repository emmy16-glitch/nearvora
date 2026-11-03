"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowUpRight, Send, UserRound } from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import { postJson, issueMessage } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import type { Beneficiary, PortfolioSnapshot, TransactionPlan } from "@/lib/types/domain";
import {
  ASSETS,
  CRYPTO_SYMBOLS,
  DEMO_NETWORK_FEES,
  type AssetSymbol,
} from "@/lib/config/assets";
import { formatAmount, shortAddress } from "@/lib/money/format";
import { toMinor } from "@/lib/money/money";
import { PageHeader, Card } from "@/components/ui/card";
import { PageSkeleton, ErrorState } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/wallets/asset-icon";
import { PlanReviewModal } from "@/components/transactions/plan-review";

function SendCryptoClient() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const portfolio = useApi<PortfolioSnapshot>("/api/wallets");
  const beneficiaries = useApi<Beneficiary[]>("/api/beneficiaries");

  const initial = (searchParams.get("asset") ?? "USDT").toUpperCase();
  const [asset, setAsset] = React.useState<AssetSymbol>(
    (CRYPTO_SYMBOLS as string[]).includes(initial) ? (initial as AssetSymbol) : "USDT",
  );
  const [network, setNetwork] = React.useState(ASSETS[asset].networks[0]?.id ?? "");
  const [address, setAddress] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [plan, setPlan] = React.useState<TransactionPlan | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);

  React.useEffect(() => {
    setNetwork(ASSETS[asset].networks[0]?.id ?? "");
  }, [asset]);

  const wallet = portfolio.data?.assets.find((item) => item.symbol === asset);
  const config = ASSETS[asset];
  const networkConfig = config.networks.find((item) => item.id === network);
  const feeUnits = DEMO_NETWORK_FEES[asset];
  const savedAddresses = (beneficiaries.data ?? []).filter(
    (beneficiary) => beneficiary.type === "crypto",
  );

  const validate = () => {
    const next: Record<string, string> = {};
    if (!address.trim()) next.address = "Enter a recipient address";
    else if (address.trim().length < 8) next.address = "Address is too short for this demo";
    if (!amount.trim()) next.amount = "Enter an amount";
    else if (!/^\d+(\.\d+)?$/.test(amount.trim())) next.amount = "Enter a valid amount";
    else if (wallet) {
      try {
        const amountMinor = BigInt(toMinor(amount.trim(), config.decimals));
        const feeMinor = BigInt(toMinor(feeUnits, config.decimals));
        if (amountMinor <= 0n) next.amount = "Amount must be greater than zero";
        else if (amountMinor + feeMinor > BigInt(wallet.available)) {
          next.amount = `Insufficient ${asset}. Available ${formatAmount(wallet.available, asset)}.`;
        }
      } catch {
        next.amount = "Enter a valid amount";
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
        title: `Send ${asset} on ${networkConfig?.name ?? "demo network"}`,
        operations: [
          {
            kind: "crypto_transfer",
            asset,
            network,
            amount: amount.trim(),
            address: address.trim(),
            note: note.trim() || undefined,
          },
        ],
        idempotencyKey: crypto.randomUUID(),
      });
      setPlan(created);
      setReviewOpen(true);
    } catch (caught) {
      toast({ title: "Could not prepare transfer", description: issueMessage(caught), variant: "error" });
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

  return (
    <div className="space-y-6">
      <Link
        href="/wallets"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> All wallets
      </Link>

      <PageHeader
        eyebrow="Crypto transfer"
        title="Send crypto"
        description="Prepare a demo transfer. Address validation, network checks and fees are enforced by the backend."
        action={<Badge variant="warning">Demo network</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5 sm:p-6">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Asset"
                value={asset}
                onChange={(event) => setAsset(event.target.value as AssetSymbol)}
              >
                {CRYPTO_SYMBOLS.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol} — {ASSETS[symbol].name}
                  </option>
                ))}
              </Select>
              <Select
                label="Network"
                value={network}
                onChange={(event) => setNetwork(event.target.value)}
              >
                {config.networks.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>

            {savedAddresses.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-2">
                  Saved recipients
                </p>
                <div className="flex flex-wrap gap-2">
                  {savedAddresses.map((beneficiary) => (
                    <button
                      key={beneficiary.id}
                      type="button"
                      onClick={() => {
                        if (beneficiary.address) setAddress(beneficiary.address);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[10.5px] text-muted transition-colors hover:text-fg"
                    >
                      <UserRound className="size-3" />
                      {beneficiary.nickname ?? beneficiary.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <Input
              label="Recipient address"
              placeholder="demo_usdt_near_testnet_recipient…"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              error={errors.address}
              autoComplete="off"
              spellCheck={false}
              hint="Demo transfers accept demo_ addresses. Never send real funds to this build."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={`Amount (${asset})`}
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                error={errors.amount}
                suffix={
                  <button
                    type="button"
                    className="text-[10px] font-semibold text-accent hover:underline"
                    onClick={() => {
                      if (!wallet) return;
                      const max = BigInt(wallet.available) - BigInt(toMinor(feeUnits, config.decimals));
                      if (max > 0n) {
                        const units = Number(max) / 10 ** config.decimals;
                        setAmount(String(units));
                      }
                    }}
                  >
                    MAX
                  </button>
                }
                hint={wallet ? `Available ${formatAmount(wallet.available, asset)}` : undefined}
              />
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-2">Network fee</p>
                <p className="mt-1 font-mono text-sm font-medium text-fg">
                  {feeUnits} {asset}
                </p>
                <p className="mt-0.5 text-[9.5px] text-muted-2">Simulated fixed fee</p>
              </div>
            </div>

            <Textarea
              label="Note (optional)"
              placeholder="What is this transfer for?"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={140}
              className="min-h-20"
            />

            <div className="rounded-xl border border-warning/20 bg-warning/[0.04] p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <p className="text-[10.5px] leading-4 text-warning/90">
                  Demo transfers do not broadcast to a blockchain. Addresses are not checked against
                  a live chain, and no network fee is paid.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] text-muted-2">
                Recipient receives {amount ? `${amount} ${asset}` : `the entered ${asset} amount`};
                the fee is added to the total debit.
              </p>
              <Button type="submit" loading={submitting} disabled={!wallet}>
                <Send className="size-4" /> Review transfer
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <AssetIcon symbol={asset} size="lg" />
              <div>
                <p className="text-sm font-semibold text-fg">{asset}</p>
                <p className="text-[10.5px] text-muted-2">{config.name}</p>
              </div>
              <ArrowUpRight className="ml-auto size-4 text-muted-2" />
            </div>
            <div className="mt-4 space-y-3 text-[11px]">
              <Row label="Available" value={formatAmount(wallet?.available ?? "0", asset)} />
              <Row label="Network" value={networkConfig?.name ?? "—"} />
              <Row
                label="Supported address"
                value={address ? shortAddress(address) : "Not entered"}
              />
              <Row label="Fee" value={`${feeUnits} ${asset}`} />
              <Row label="Custody" value="Demo — no live keys" />
            </div>
          </Card>
          <DemoNotice>
            Demo addresses are reserved strings beginning with <code>demo_</code>. They cannot
            receive real crypto.
          </DemoNotice>
        </div>
      </div>

      <PlanReviewModal
        plan={plan}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onExecuted={(executed) => {
          setPlan(executed);
          setAddress("");
          setAmount("");
          setNote("");
          void portfolio.refetch({ quiet: true });
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="max-w-[60%] truncate text-right font-medium text-fg">{value}</span>
    </div>
  );
}

export default function SendCryptoPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <SendCryptoClient />
    </React.Suspense>
  );
}
