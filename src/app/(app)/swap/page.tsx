"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowLeftRight,
  Info,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import { postJson, issueMessage, ApiClientError } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import { useCountdown } from "@/lib/hooks/use-countdown";
import type { PortfolioSnapshot, Quote, TransactionPlan } from "@/lib/types/domain";
import { ASSETS, type AssetSymbol } from "@/lib/config/assets";
import { formatAmount, formatNgn, formatRate } from "@/lib/money/format";
import { toMinor } from "@/lib/money/money";
import { PageHeader, Card } from "@/components/ui/card";
import { PageSkeleton, ErrorState, InlineLoader } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/wallets/asset-icon";
import { PlanReviewModal } from "@/components/transactions/plan-review";

const ALL = Object.keys(ASSETS) as AssetSymbol[];

function SwapClient() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const portfolio = useApi<PortfolioSnapshot>("/api/wallets");

  const initialFrom = (searchParams.get("from") ?? "NGN").toUpperCase();
  const initialTo = (searchParams.get("to") ?? "USDT").toUpperCase();
  const [from, setFrom] = React.useState<AssetSymbol>(
    ALL.includes(initialFrom as AssetSymbol) ? (initialFrom as AssetSymbol) : "NGN",
  );
  const [to, setTo] = React.useState<AssetSymbol>(
    ALL.includes(initialTo as AssetSymbol) && initialTo !== initialFrom
      ? (initialTo as AssetSymbol)
      : "USDT",
  );
  const [amount, setAmount] = React.useState("");
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);
  const [plan, setPlan] = React.useState<TransactionPlan | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const { seconds, expired } = useCountdown(quote?.expiresAt);

  const fromAsset = portfolio.data?.assets.find((item) => item.symbol === from);
  const amountMinor = /^\d+(\.\d+)?$/.test(amount.trim())
    ? safeMinor(amount.trim(), ASSETS[from].decimals)
    : "0";

  const fetchQuote = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!amount.trim() || !/^\d+(\.\d+)?$/.test(amount.trim())) {
        setQuote(null);
        setQuoteError(null);
        return;
      }
      if (BigInt(safeMinor(amount.trim(), ASSETS[from].decimals)) <= 0n) {
        setQuote(null);
        return;
      }
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const result = await fetch("/api/quotes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ from, to, amount: amount.trim(), side: "from" }),
          signal,
        });
        const payload = await resJson(result);
        setQuote(payload);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setQuote(null);
        setQuoteError(
          error instanceof ApiClientError
            ? error.message
            : "Could not obtain a demo quote.",
        );
      } finally {
        if (!signal?.aborted) setQuoteLoading(false);
      }
    },
    [amount, from, to],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void fetchQuote(controller.signal), 450);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [fetchQuote]);

  const flip = () => {
    setFrom(to);
    setTo(from);
    setAmount("");
    setQuote(null);
    setQuoteError(null);
  };

  const createPlan = async () => {
    if (!quote) return;
    setCreating(true);
    try {
      const created = await postJson<TransactionPlan>("/api/plans", {
        title: `Convert ${from} to ${to}`,
        operations: [{ kind: "swap", fromAsset: from, toAsset: to, amount: amount.trim() }],
        idempotencyKey: crypto.randomUUID(),
      });
      setPlan(created);
      setReviewOpen(true);
    } catch (caught) {
      toast({ title: "Could not prepare swap", description: issueMessage(caught), variant: "error" });
    } finally {
      setCreating(false);
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

  const insufficient =
    Boolean(fromAsset) &&
    BigInt(amountMinor) > BigInt(fromAsset?.available ?? "0") &&
    BigInt(amountMinor) > 0n;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> Home
      </Link>

      <PageHeader
        eyebrow="Convert & swap"
        title="Swap assets"
        description="Convert Naira to crypto, crypto to Naira, or crypto to crypto. Quotes are simulated and clearly labelled."
        action={<Badge variant="warning">Simulated quotes</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <Select label="From" value={from} onChange={(event) => setFrom(event.target.value as AssetSymbol)}>
              {ALL.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol} — {ASSETS[symbol].name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={flip}
              className="mb-0.5 hidden size-10 place-items-center rounded-xl border border-line bg-surface-2 text-muted transition-colors hover:text-fg sm:grid"
              aria-label="Swap from and to assets"
            >
              <ArrowDownUp className="size-4" />
            </button>
            <Select label="To" value={to} onChange={(event) => setTo(event.target.value as AssetSymbol)}>
              {ALL.filter((symbol) => symbol !== from).map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol} — {ASSETS[symbol].name}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4">
            <Input
              label={`Amount (${from})`}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={insufficient ? `Insufficient ${from} balance` : undefined}
              prefix={<AssetIcon symbol={from} size="sm" className="size-6 text-[9px]" />}
              suffix={
                <button
                  type="button"
                  className="text-[10px] font-semibold text-accent hover:underline"
                  onClick={() => {
                    if (!fromAsset) return;
                    setAmount(String(Number(fromAsset.available) / 10 ** ASSETS[from].decimals));
                  }}
                >
                  MAX
                </button>
              }
              hint={
                fromAsset
                  ? `Available ${formatAmount(fromAsset.available, from)}`
                  : "Wallet unavailable"
              }
            />
          </div>

          <div className="relative my-3 flex items-center justify-center">
            <div className="absolute inset-x-0 border-t border-line" />
            <button
              type="button"
              onClick={flip}
              className="relative grid size-8 place-items-center rounded-full border border-line-strong bg-surface text-muted transition-colors hover:text-fg sm:hidden"
              aria-label="Swap from and to assets"
            >
              <ArrowDownUp className="size-3.5" />
            </button>
          </div>

          <div className="rounded-xl border border-line bg-surface-2/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-2">You receive (estimated)</p>
              {quoteLoading ? <InlineLoader label="Quoting" /> : null}
            </div>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-fg">
              {quote ? formatAmount(quote.toAmount, to) : `0 ${to}`}
            </p>
            {quote ? (
              <p className="mt-1 text-[10.5px] text-muted-2">{formatRate(quote.rate, from, to)}</p>
            ) : (
              <p className="mt-1 text-[10.5px] text-muted-2">
                Enter an amount to request a demo quote.
              </p>
            )}
          </div>

          {quoteError ? (
            <p className="mt-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-[10.5px] text-danger">
              {quoteError}
            </p>
          ) : null}

          <div className="mt-4 space-y-2.5 rounded-xl border border-line bg-surface p-3.5">
            <QuoteLine label="Rate" value={quote ? formatRate(quote.rate, from, to) : "—"} />
            <QuoteLine
              label="Nearvora fee"
              value={quote ? `${formatAmount(quote.fee, quote.feeAsset)} (0.60%)` : "—"}
            />
            <QuoteLine label="Spread" value={quote ? `${(quote.spreadBps / 100).toFixed(2)}%` : "—"} />
            <QuoteLine
              label="Slippage tolerance"
              value={quote ? `${(quote.slippageBps / 100).toFixed(2)}%` : "—"}
            />
            <QuoteLine
              label="Quote expires"
              value={
                quote
                  ? expired
                    ? "Expired"
                    : `in ${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`
                  : "—"
              }
            />
            <div className="flex items-center justify-between border-t border-line pt-2.5">
              <span className="flex items-center gap-1.5 text-[10.5px] text-muted">
                <ShieldCheck className="size-3.5 text-accent" /> Quote source
              </span>
              <span className="text-[10.5px] font-medium text-warning">Simulated provider</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xs text-[10px] leading-4 text-muted-2">
              Backend revalidates the quote and balances when you approve. No swap has executed yet.
            </p>
            <div className="flex gap-2">
              {quote && expired ? (
                <Button variant="outline" size="md" onClick={() => void fetchQuote()}>
                  <RefreshCw className="size-4" /> Refresh quote
                </Button>
              ) : null}
              <Button
                onClick={createPlan}
                loading={creating}
                disabled={!quote || expired || quoteLoading || insufficient || Boolean(quoteError)}
              >
                <ArrowLeftRight className="size-4" /> Review transaction
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-fg">Balance</h3>
            <div className="mt-4 flex items-center gap-3">
              <AssetIcon symbol={from} size="lg" />
              <div>
                <p className="text-xs font-medium text-fg">{from}</p>
                <p className="font-mono text-[11px] text-muted">
                  {formatAmount(fromAsset?.available ?? "0", from)}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-muted-2">≈</p>
                <p className="font-mono text-[11px] text-muted">
                  {formatNgn(fromAsset?.valueNgn ?? "0")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-surface-2 p-3">
              <Info className="mt-0.5 size-3.5 shrink-0 text-teal" />
              <p className="text-[10px] leading-4 text-muted">
                Rates are static demo reference rates. Live NEAR Intents routing is not configured,
                so cross-chain execution is unavailable.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-fg">Supported assets</h3>
            <div className="mt-3 space-y-2">
              {ALL.filter((symbol) => symbol !== "NGN").map((symbol) => (
                <div key={symbol} className="flex items-center gap-2.5">
                  <AssetIcon symbol={symbol} size="sm" />
                  <span className="flex-1 text-[11px] text-fg">{symbol}</span>
                  <span className="text-[9.5px] text-muted-2">{ASSETS[symbol].networks[0]?.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[9.5px] leading-4 text-muted-2">
              Only networks shown here are configured for this demo. Do not assume other chains are
              supported.
            </p>
          </Card>
        </div>
      </div>

      <DemoNotice>
        This swap is simulated. No chain transaction, solver or liquidity venue is contacted, and no
        real asset is exchanged.
      </DemoNotice>

      <PlanReviewModal
        plan={plan}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onExecuted={(executed) => {
          setPlan(executed);
          setAmount("");
          setQuote(null);
          void portfolio.refetch({ quiet: true });
        }}
      />
    </div>
  );
}

function QuoteLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10.5px] text-muted">{label}</span>
      <span className="max-w-[62%] text-right font-mono text-[10.5px] text-fg">{value}</span>
    </div>
  );
}

function safeMinor(amount: string, decimals: number): string {
  try {
    return toMinor(amount, decimals);
  } catch {
    return "0";
  }
}

async function resJson(response: Response): Promise<Quote> {
  const payload = (await response.json()) as
    | { ok: true; data: Quote }
    | { ok: false; error: { code: string; message: string; details?: unknown } };
  if (!response.ok || !payload.ok) {
    throw new ApiClientError(
      response.status,
      payload.ok ? "REQUEST_FAILED" : payload.error.code,
      payload.ok ? "Quote request failed" : payload.error.message,
      payload.ok ? undefined : payload.error.details,
    );
  }
  return payload.data;
}

export default function SwapPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <SwapClient />
    </React.Suspense>
  );
}
