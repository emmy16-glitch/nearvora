"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Info,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import { postJson, issueMessage, ApiClientError } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import type { PortfolioSnapshot, Quote, TransactionPlan } from "@/lib/types/domain";
import {
  ASSETS,
  ASSET_SYMBOLS,
  CRYPTO_SYMBOLS,
  DEMO_NGN_RATES,
  DEMO_NETWORK_FEES,
  type AssetSymbol,
} from "@/lib/config/assets";
import { formatAmount, formatNgn, formatRate } from "@/lib/money/format";
import { toMinor } from "@/lib/money/money";
import { formatCountdown, useCountdown } from "@/lib/hooks/use-countdown";
import { Card } from "@/components/ui/card";
import { PageSkeleton, ErrorState, InlineLoader } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Button } from "@/components/ui/button";
import { SegmentedTabs } from "@/components/ui/tabs";
import { AssetIcon } from "@/components/wallets/asset-icon";
import { PlanReviewModal } from "@/components/transactions/plan-review";
import { NotificationBell } from "@/components/layout/app-shell";

type Mode = "swap" | "convert";

function AssetPicker({
  value,
  options,
  onChange,
  label,
}: {
  value: AssetSymbol;
  options: AssetSymbol[];
  onChange: (value: AssetSymbol) => void;
  label: string;
}) {
  return (
    <div className="relative flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-2.5 py-2 transition-colors hover:border-line-strong">
      <AssetIcon symbol={value} size="sm" />
      <span className="text-[13px] font-semibold text-fg">{value}</span>
      <ChevronDown className="size-3.5 text-muted" aria-hidden />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as AssetSymbol)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((symbol) => (
          <option key={symbol} value={symbol}>
            {symbol} — {ASSETS[symbol].name}
          </option>
        ))}
      </select>
    </div>
  );
}

function SwapClient() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const portfolio = useApi<PortfolioSnapshot>("/api/wallets");

  const initialFrom = (searchParams.get("from") ?? "").toUpperCase();
  const initialTo = (searchParams.get("to") ?? "").toUpperCase();
  const [mode, setMode] = React.useState<Mode>(
    (ASSET_SYMBOLS as string[]).includes(initialFrom) ? "convert" : "swap",
  );
  const [from, setFrom] = React.useState<AssetSymbol>(
    (ASSET_SYMBOLS as string[]).includes(initialFrom) ? (initialFrom as AssetSymbol) : "USDT",
  );
  const [to, setTo] = React.useState<AssetSymbol>(
    (ASSET_SYMBOLS as string[]).includes(initialTo) ? (initialTo as AssetSymbol) : "BTC",
  );
  const [amount, setAmount] = React.useState("");
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [plan, setPlan] = React.useState<TransactionPlan | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const { seconds, expired } = useCountdown(quote?.expiresAt);

  const fromAsset = portfolio.data?.assets.find((asset) => asset.symbol === from);
  const fromDecimals = ASSETS[from].decimals;
  const amountMinor = React.useMemo(() => {
    try {
      return toMinor(amount.trim() || "0", fromDecimals);
    } catch {
      return "0";
    }
  }, [amount, fromDecimals]);

  const insufficient =
    Boolean(fromAsset) && BigInt(amountMinor) > BigInt(fromAsset?.available ?? "0");

  const fetchQuote = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!amount.trim() || !/^\d+(\.\d+)?$/.test(amount.trim()) || BigInt(amountMinor) <= 0n) {
        setQuote(null);
        setQuoteError(null);
        return;
      }
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const response = await fetch("/api/quotes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          signal,
          body: JSON.stringify({ from, to, amount: amount.trim(), side: "from" }),
        });
        const payload = (await response.json()) as
          | { ok: true; data: Quote }
          | { ok: false; error: { code: string; message: string; details?: unknown } };
        if (!response.ok || !payload.ok) {
          throw new ApiClientError(
            response.status,
            payload.ok ? "REQUEST_FAILED" : payload.error.code,
            payload.ok ? "Quote request failed" : payload.error.message,
          );
        }
        setQuote(payload.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setQuote(null);
        setQuoteError(error instanceof ApiClientError ? error.message : "Could not obtain a demo quote.");
      } finally {
        if (!signal?.aborted) setQuoteLoading(false);
      }
    },
    [amount, amountMinor, from, to],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void fetchQuote(controller.signal), 420);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [fetchQuote]);

  const applyMode = (next: Mode) => {
    setMode(next);
    setAmount("");
    setQuote(null);
    setQuoteError(null);
    if (next === "swap") {
      setFrom("USDT");
      setTo("BTC");
    } else {
      setFrom("NGN");
      setTo("USDT");
    }
  };

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
        title: mode === "swap" ? `Swap ${from} to ${to}` : `Convert ${from} to ${to}`,
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

  const options = mode === "swap" ? CRYPTO_SYMBOLS : ASSET_SYMBOLS;
  const toUnits = quote ? Number(quote.toAmount) / 10 ** ASSETS[to].decimals : 0;
  const fromNgn =
    from === "NGN"
      ? Number(amountMinor) / 100
      : (Number(amountMinor) / 10 ** fromDecimals) * Number(DEMO_NGN_RATES[from]);
  const toNgn = toUnits * Number(DEMO_NGN_RATES[to]);

  return (
    <div className="space-y-5 pb-2">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          aria-label="Go back"
          className="grid size-10 place-items-center rounded-full text-fg transition-colors hover:bg-surface-2"
        >
          <ChevronRight className="size-5 rotate-180" />
        </Link>
        <h1 className="text-center text-[17px] font-semibold tracking-tight text-fg sm:text-lg">
          Swap / Convert
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={flip}
            aria-label="Swap from and to assets"
            className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:text-fg"
          >
            <SlidersHorizontal className="size-[18px]" />
          </button>
          <NotificationBell className="lg:hidden" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl space-y-4">
        <SegmentedTabs
          tabs={[
            { value: "swap", label: "Swap" },
            { value: "convert", label: "Convert" },
          ]}
          value={mode}
          onChange={applyMode}
        />

        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11.5px] font-medium text-muted">From</p>
              <span className="text-[10px] text-muted-2">
                {fromAsset ? `Available ${formatAmount(fromAsset.available, from)}` : "—"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <AssetPicker
                label="From asset"
                value={from}
                options={options.filter((symbol) => symbol !== to)}
                onChange={(symbol) => {
                  setFrom(symbol);
                  setAmount("");
                  setQuote(null);
                }}
              />
              <input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                aria-label={`Amount in ${from}`}
                className="min-w-0 flex-1 bg-transparent text-right font-mono text-[26px] font-semibold tracking-tight text-fg outline-none placeholder:text-muted-2 sm:text-[30px]"
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!fromAsset) return;
                  setAmount(String(Number(fromAsset.available) / 10 ** fromDecimals));
                }}
                className="rounded-md border border-line px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted transition-colors hover:text-fg"
              >
                Max
              </button>
              <p className="text-right font-mono text-[11px] text-muted-2">
                ≈ {formatNgn(String(Math.round(fromNgn * 100)))}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex justify-center">
            <button
              type="button"
              onClick={flip}
              aria-label="Reverse swap direction"
              className="-my-3 grid size-10 place-items-center rounded-full border border-line-strong bg-surface-2 text-lavender shadow-[0_4px_16px_rgba(0,0,0,0.45)] transition-colors hover:border-accent/50 hover:text-fg"
            >
              <ArrowUpDown className="size-[18px]" />
            </button>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11.5px] font-medium text-muted">To</p>
              {quoteLoading ? <InlineLoader label="Quoting" /> : null}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <AssetPicker
                label="To asset"
                value={to}
                options={options.filter((symbol) => symbol !== from)}
                onChange={(symbol) => {
                  setTo(symbol);
                  setQuote(null);
                }}
              />
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate font-mono text-[26px] font-semibold tracking-tight text-fg sm:text-[30px]">
                  {quote
                    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(toUnits)
                    : "0.00"}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-2">
                  ≈ {formatNgn(String(Math.round(toNgn * 100)))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {insufficient ? (
          <p className="rounded-xl border border-danger/25 bg-danger/5 px-3 py-2 text-[11px] text-danger">
            Insufficient {from} balance. Available {fromAsset ? formatAmount(fromAsset.available, from) : "0"}.
          </p>
        ) : null}
        {quoteError ? (
          <p className="rounded-xl border border-danger/25 bg-danger/5 px-3 py-2 text-[11px] text-danger">
            {quoteError}
          </p>
        ) : null}

        <div className="rounded-2xl border border-line bg-surface p-4">
          <SummaryLine label="Rate" value={quote ? formatRate(quote.rate, from, to) : "—"} />
          <SummaryLine
            label="Network Fee"
            value={`${DEMO_NETWORK_FEES[to]} ${to} (≈ ${formatNgn(
              String(Math.round(Number(DEMO_NETWORK_FEES[to]) * Number(DEMO_NGN_RATES[to]) * 100)),
            )})`}
          />
          <div className="my-2 border-t border-line" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-muted">You&apos;ll receive</span>
            <span className="text-right font-mono text-[12px] font-semibold text-fg">
              {quote ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(toUnits)} ${to}` : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-muted-2">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3 text-lavender" /> Simulated quote
            </span>
            <span>
              {quote && !expired ? `Expires in ${formatCountdown(seconds)}` : quote && expired ? "Quote expired" : "—"}
            </span>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={createPlan}
          loading={creating}
          disabled={!quote || expired || quoteLoading || insufficient || Boolean(quoteError)}
        >
          {quote && expired ? (
            <>
              <RefreshCw className="size-4" /> Refresh quote
            </>
          ) : (
            <>
              <ArrowLeftRight className="size-4" /> Review {mode === "swap" ? "Swap" : "Convert"}
            </>
          )}
        </Button>

        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-[10px] leading-4 text-muted-2">
            Final amounts and fees are revalidated when you approve.
          </p>
          <Link href="/rates" className="shrink-0 text-[10.5px] font-medium text-lavender hover:underline">
            View rates
          </Link>
        </div>

        <Card className="p-4 lg:hidden">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 size-3.5 shrink-0 text-lavender" />
            <p className="text-[10.5px] leading-4 text-muted">
              {mode === "swap"
                ? "Swap converts between crypto assets. Convert moves between Naira and crypto."
                : "Convert lets you move between Naira and crypto at a simulated rate."}{" "}
              Demo quotes use static reference rates.
            </p>
          </div>
        </Card>
      </div>

      <div className="mx-auto hidden w-full max-w-xl lg:block">
        <DemoNotice>
          This {mode === "swap" ? "swap" : "conversion"} is simulated. No chain transaction, solver
          or liquidity venue is contacted, and no real asset is exchanged.
        </DemoNotice>
      </div>

      <div className="mx-auto w-full max-w-xl lg:hidden">
        <DemoNotice>
          Simulated quote. No chain transaction occurs and no real asset is exchanged.
        </DemoNotice>
      </div>

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

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="max-w-[65%] text-right font-mono text-[11.5px] text-fg">{value}</span>
    </div>
  );
}

export default function SwapPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <SwapClient />
    </React.Suspense>
  );
}
