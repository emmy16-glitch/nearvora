"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import { apiFetch, issueMessage, postJson } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import type { LiveSwap } from "@/lib/types/domain";
import { ASSETS, CRYPTO_SYMBOLS, type AssetSymbol } from "@/lib/config/assets";
import { formatAmount, formatRate, shortAddress, shortReference } from "@/lib/money/format";
import { formatCountdown, useCountdown } from "@/lib/hooks/use-countdown";
import { PageHeader, Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";

const TERMINAL = new Set(["SUCCESS", "REFUNDED", "FAILED"]);

interface SupportedToken {
  assetId: string;
  symbol: string;
  blockchain: string;
  decimals: number;
}

export default function LiveSwapPage() {
  const { toast } = useToast();
  const recent = useApi<LiveSwap[]>("/api/intents/swaps");
  const tokens = useApi<SupportedToken[]>("/api/intents/tokens");
  const [from, setFrom] = React.useState<AssetSymbol>("USDT");
  const [to, setTo] = React.useState<AssetSymbol>("USDC");
  const [originAssetId, setOriginAssetId] = React.useState("");
  const [destinationAssetId, setDestinationAssetId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [recipient, setRecipient] = React.useState("");
  const [refundTo, setRefundTo] = React.useState("");
  const [slippageBps, setSlippageBps] = React.useState("100");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [creating, setCreating] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [swap, setSwap] = React.useState<LiveSwap | null>(null);
  const [txHash, setTxHash] = React.useState("");
  const [submittingHash, setSubmittingHash] = React.useState(false);
  const { seconds, expired } = useCountdown(swap?.expiresAt);
  const status = swap?.status ?? null;
  const terminal = status ? TERMINAL.has(status) : false;

  const refresh = React.useCallback(
    async (id: string, quiet = false) => {
      if (!quiet) setRefreshing(true);
      try {
        const updated = await apiFetch<LiveSwap>(`/api/intents/swaps/${id}`);
        setSwap(updated);
        void recent.refetch({ quiet: true });
        return updated;
      } catch (error) {
        if (!quiet) {
          toast({
            title: "Could not refresh status",
            description: issueMessage(error),
            variant: "error",
          });
        }
        return null;
      } finally {
        if (!quiet) setRefreshing(false);
      }
    },
    [recent, toast],
  );

  React.useEffect(() => {
    if (!swap || TERMINAL.has(swap.status)) return;
    const timer = setInterval(() => void refresh(swap.id, true), 15_000);
    return () => clearInterval(timer);
  }, [refresh, swap]);

  React.useEffect(() => {
    const list = tokens.data;
    if (!list) return;
    setOriginAssetId((current) => pickToken(list, from, current));
    setDestinationAssetId((current) => pickToken(list, to, current));
  }, [tokens.data, from, to]);

  const options = CRYPTO_SYMBOLS.filter((symbol) => symbol !== "NGN");
  const originTokens = (tokens.data ?? []).filter((token) => token.symbol === from);
  const destinationTokens = (tokens.data ?? []).filter((token) => token.symbol === to);

  const validate = () => {
    const next: Record<string, string> = {};
    if (from === to) next.to = "Choose a different destination asset";
    if (!amount.trim()) next.amount = "Enter an amount";
    else if (!/^\d+(\.\d+)?$/.test(amount.trim())) next.amount = "Enter a valid amount";
    else if (Number(amount) <= 0) next.amount = "Amount must be greater than zero";
    if (recipient.trim().length < 8) next.recipient = "Enter the destination chain address";
    if (refundTo.trim().length < 8) next.refundTo = "Enter the origin chain refund address";
    if (tokens.data && !originAssetId) next.from = `No 1Click token found for ${from}`;
    if (tokens.data && !destinationAssetId) next.to = `No 1Click token found for ${to}`;
    const slippage = Number(slippageBps);
    if (!Number.isFinite(slippage) || slippage < 1 || slippage > 5000) {
      next.slippage = "Slippage must be between 1 and 5000 bps";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const createSwap = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setCreating(true);
    try {
      const created = await postJson<LiveSwap>("/api/intents/swaps", {
        from,
        to,
        amount: amount.trim(),
        originAssetId: originAssetId || undefined,
        destinationAssetId: destinationAssetId || undefined,
        recipient: recipient.trim(),
        refundTo: refundTo.trim(),
        slippageBps: Number(slippageBps),
      });
      setSwap(created);
      setTxHash("");
      void recent.refetch({ quiet: true });
      toast({
        title: "Live swap created",
        description: "Send the exact amount to the 1Click deposit address.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Could not create live swap",
        description: issueMessage(error),
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  const submitDeposit = async () => {
    if (!swap || !txHash.trim()) return;
    setSubmittingHash(true);
    try {
      const updated = await postJson<LiveSwap>(`/api/intents/swaps/${swap.id}/deposit`, {
        txHash: txHash.trim(),
      });
      setSwap(updated);
      void recent.refetch({ quiet: true });
      toast({
        title: "Deposit reported",
        description: "1Click will confirm the transaction and settle the swap.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Could not submit deposit hash",
        description: issueMessage(error),
        variant: "error",
      });
    } finally {
      setSubmittingHash(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/swap"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> Back to swaps
      </Link>

      <PageHeader
        eyebrow="Live cross-chain execution"
        title="Swap with NEAR Intents"
        description="Request a real 1Click quote, send the deposit from your own wallet, and track settlement. Nearvora never holds your funds."
        action={<Badge variant="success">Live · 1Click</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-5 sm:p-6">
          <form onSubmit={createSwap} className="space-y-4" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="From"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value as AssetSymbol);
                  setSwap(null);
                }}
              >
                {options.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol} — {ASSETS[symbol].name}
                  </option>
                ))}
              </Select>
              <Select
                label="To"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value as AssetSymbol);
                  setSwap(null);
                }}
              >
                {options.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol} — {ASSETS[symbol].name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label={`From network (${from})`}
                value={originAssetId}
                onChange={(event) => {
                  setOriginAssetId(event.target.value);
                  setSwap(null);
                }}
                disabled={originTokens.length === 0}
                error={errors.from}
              >
                {originTokens.map((token) => (
                  <option key={token.assetId} value={token.assetId}>
                    {token.blockchain} · {token.decimals} decimals
                  </option>
                ))}
              </Select>
              <Select
                label={`To network (${to})`}
                value={destinationAssetId}
                onChange={(event) => {
                  setDestinationAssetId(event.target.value);
                  setSwap(null);
                }}
                disabled={destinationTokens.length === 0}
                error={errors.to}
              >
                {destinationTokens.map((token) => (
                  <option key={token.assetId} value={token.assetId}>
                    {token.blockchain} · {token.decimals} decimals
                  </option>
                ))}
              </Select>
            </div>

            {tokens.error ? (
              <p className="rounded-xl border border-warning/25 bg-warning/5 px-3 py-2 text-[10.5px] text-warning">
                Could not load 1Click networks: {tokens.error.message}. The backend will use its
                default asset mapping.
              </p>
            ) : null}

            <Input
              label={`Amount (${from})`}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
              error={errors.amount}
              hint={`Smallest unit handled automatically (${ASSETS[from].decimals} decimals).`}
            />

            <Input
              label={`Destination address (${to})`}
              placeholder={to === "BTC" ? "bc1…" : "0x…"}
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              error={errors.recipient}
              autoComplete="off"
              spellCheck={false}
              hint={`Where the swapped ${to} should be delivered.`}
            />

            <Input
              label={`Refund address (${from})`}
              placeholder={from === "BTC" ? "bc1…" : "0x…"}
              value={refundTo}
              onChange={(event) => setRefundTo(event.target.value)}
              error={errors.refundTo}
              autoComplete="off"
              spellCheck={false}
              hint={`Refunds return here if the swap fails. Must be on the ${from} origin chain.`}
            />

            <Input
              label="Slippage tolerance (bps)"
              inputMode="numeric"
              value={slippageBps}
              onChange={(event) => setSlippageBps(event.target.value.replace(/[^0-9]/g, ""))}
              error={errors.slippage}
              hint="100 bps = 1%."
            />

            <Button type="submit" size="lg" className="w-full" loading={creating}>
              <Zap className="size-4" /> Get live quote & deposit address
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          {swap ? (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                <StatusBadge status={swap.status} />
                <span className="text-[11.5px] font-medium text-fg">
                  {formatAmount(swap.amountIn, swap.from)} → {formatAmount(swap.amountOut, swap.to)}
                </span>
                {!terminal ? (
                  <Badge variant={expired ? "danger" : "info"} className="ml-auto">
                    {expired
                      ? "Deposit address may be inactive"
                      : `Quote expires in ${formatCountdown(seconds)}`}
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-3 p-4">
                <div className="rounded-xl border border-accent/25 bg-accent/5 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                    Send exactly
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold text-fg">
                    {formatAmount(swap.amountIn, swap.from)}
                  </p>
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-2">
                    To this {swap.from} deposit address
                  </p>
                  <p className="mt-1 break-all font-mono text-[11.5px] text-fg">
                    {swap.depositAddress}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CopyButton value={swap.depositAddress} label="Copy address" />
                    {swap.depositMemo ? <CopyButton value={swap.depositMemo} label="Copy memo" /> : null}
                  </div>
                  {swap.depositMemo ? (
                    <p className="mt-2 break-all text-[10.5px] text-warning">
                      Memo required: <span className="font-mono">{swap.depositMemo}</span>
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-warning/25 bg-warning/5 p-3">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    <p className="text-[10.5px] leading-4 text-muted">
                      Send only {swap.from} on the origin chain, in one transaction, and exactly the
                      quoted amount. Do not send from an exchange withdrawal address. Nearvora
                      cannot recover funds sent to the wrong address.
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <dt className="text-muted-2">Rate</dt>
                    <dd className="mt-0.5 font-mono text-fg">{formatRate(swap.rate, swap.from, swap.to)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-2">Minimum out</dt>
                    <dd className="mt-0.5 font-mono text-fg">
                      {swap.minAmountOut ? formatAmount(swap.minAmountOut, swap.to) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-2">Destination</dt>
                    <dd className="mt-0.5 truncate font-mono text-fg" title={swap.recipient}>
                      {shortAddress(swap.recipient)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-2">Refund to</dt>
                    <dd className="mt-0.5 truncate font-mono text-fg" title={swap.refundTo}>
                      {shortAddress(swap.refundTo)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-2">1Click correlation</dt>
                    <dd className="mt-0.5 truncate font-mono text-[10.5px] text-fg">
                      {shortReference(swap.correlationId, 16, 8)}
                    </dd>
                  </div>
                </dl>

                {!terminal ? (
                  <div className="space-y-2 border-t border-line pt-3">
                    <Input
                      label="Deposit transaction hash (optional)"
                      placeholder="0x…"
                      value={txHash}
                      onChange={(event) => setTxHash(event.target.value)}
                      hint="Submitting the hash can speed up 1Click processing."
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void refresh(swap.id)}
                        loading={refreshing}
                      >
                        <RefreshCw className="size-3.5" /> Refresh status
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={submitDeposit}
                        loading={submittingHash}
                        disabled={txHash.trim().length < 8}
                      >
                        Submit hash
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-3 text-[11px] text-muted">
                    {swap.status === "SUCCESS" ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <ShieldAlert className="size-4 text-warning" />
                    )}
                    <span>
                      {swap.status === "SUCCESS"
                        ? "Settlement confirmed by 1Click."
                        : swap.status === "REFUNDED"
                          ? `Swap refunded${swap.refundReason ? `: ${swap.refundReason}` : "."}`
                          : "1Click reported a failed swap. Check the refund address."}
                    </span>
                  </div>
                )}

                <a
                  href="https://explorer.near-intents.org"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-lavender hover:underline"
                >
                  Open NEAR Intents Explorer <ExternalLink className="size-3" />
                </a>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                  <ArrowLeftRight className="size-4" />
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold text-fg">How live execution works</p>
                  <ol className="mt-2 space-y-1.5 text-[11px] leading-5 text-muted">
                    <li>1. Enter the destination and refund addresses.</li>
                    <li>2. 1Click returns a real quote and deposit address.</li>
                    <li>3. Send the exact amount from your own wallet.</li>
                    <li>4. Track the swap here until it settles or refunds.</li>
                  </ol>
                  <p className="mt-3 text-[10.5px] text-muted-2">
                    Nearvora demo balances are not debited. This is a self-custody 1Click swap.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Recent live swaps
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void recent.refetch()}
                loading={recent.loading}
              >
                <RefreshCw className="size-3" />
              </Button>
            </div>
            {recent.data && recent.data.length > 0 ? (
              <div className="divide-y divide-line">
                {recent.data.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSwap(item);
                      setTxHash(item.txHash ?? "");
                    }}
                    className="flex w-full items-center gap-2 py-2 text-left transition-colors hover:text-fg"
                  >
                    <StatusBadge status={item.status} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-muted">
                      {formatAmount(item.amountIn, item.from)} → {formatAmount(item.amountOut, item.to)}
                    </span>
                    <span className="shrink-0 text-[9.5px] text-muted-2">
                      {shortReference(item.id)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-2 text-[10.5px] text-muted-2">No live swaps yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}


function pickToken(tokens: SupportedToken[], symbol: AssetSymbol, current: string): string {
  const options = tokens.filter((token) => token.symbol === symbol);
  if (options.some((token) => token.assetId === current)) return current;
  return options[0]?.assetId ?? "";
}
