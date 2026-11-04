"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpDown, BarChart3, ChevronDown, ChevronRight, RefreshCw, TrendingUp } from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import type { RatesSnapshot } from "@/lib/services/rates";
import { ASSETS, ASSET_SYMBOLS, type AssetSymbol } from "@/lib/config/assets";
import { relativeTime } from "@/lib/money/format";
import { SegmentedTabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton, ErrorState } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { AssetIcon } from "@/components/wallets/asset-icon";
import { NotificationBell } from "@/components/layout/app-shell";

type Tab = "market" | "calculator";

export default function RatesPage() {
  const rates = useApi<RatesSnapshot>("/api/rates");
  const [tab, setTab] = React.useState<Tab>("market");

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
          Rates
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/swap"
            aria-label="Open swap"
            className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:text-fg"
          >
            <BarChart3 className="size-[18px]" />
          </Link>
          <NotificationBell className="lg:hidden" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-4">
        <SegmentedTabs
          tabs={[
            { value: "market", label: "Market Rates" },
            { value: "calculator", label: "Calculator" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "market" ? (
          <>
            <div className="nv-brand-gradient relative overflow-hidden rounded-3xl border border-accent/30 p-5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full bg-white/10 blur-3xl" aria-hidden />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] font-semibold">Live Exchange Rates</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/70">
                    <span className="size-1.5 rounded-full bg-[#86efac]" aria-hidden />
                    Updated every 30 seconds
                  </p>
                </div>
                <span className="grid size-11 place-items-center rounded-xl border border-white/15 bg-white/10">
                  <BarChart3 className="size-5" />
                </span>
              </div>
              <div className="relative mt-4 flex items-center justify-between gap-3 text-[10px] text-white/60">
                <span>{rates.data ? `Last updated ${relativeTime(rates.data.updatedAt)}` : "Loading rates…"}</span>
                <Badge variant="warning">Demo rates</Badge>
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-line bg-surface">
              {rates.loading && !rates.data ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <Skeleton className="h-3 flex-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              ) : rates.error && !rates.data ? (
                <div className="p-4">
                  <ErrorState
                    title="Rates unavailable"
                    message={rates.error.message}
                    onRetry={() => rates.refetch()}
                  />
                </div>
              ) : (
                (rates.data?.rates ?? []).map((rate) => (
                  <div
                    key={rate.symbol}
                    className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0"
                  >
                    <AssetIcon symbol={rate.symbol} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-fg">{rate.symbol}</p>
                      <p className="truncate text-[10px] text-muted-2">{rate.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-[12px] font-medium text-fg">
                        1 {rate.symbol} = ₦{Number(rate.rateNgn).toLocaleString("en-US")}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-success">
                        <TrendingUp className="size-2.5" /> +{rate.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </section>

            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-[10px] text-muted-2">
                {rates.data?.source ?? "Simulated demonstration feed"}
              </p>
              <button
                type="button"
                onClick={() => void rates.refetch()}
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-lavender hover:underline"
              >
                <RefreshCw className="size-3" /> Refresh
              </button>
            </div>
          </>
        ) : (
          <RateCalculator />
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <DemoNotice>
          Rates and percentage changes are demonstration values, not live market data. Percentages
          are shown only because this demo feed publishes simulated history.
        </DemoNotice>
      </div>
    </div>
  );
}

function RateCalculator() {
  const [from, setFrom] = React.useState<AssetSymbol>("NGN");
  const [to, setTo] = React.useState<AssetSymbol>("USDT");
  const [amount, setAmount] = React.useState("100000");

  const numeric = Number(amount.replace(/,/g, ""));
  const result = React.useMemo(() => {
    if (!Number.isFinite(numeric) || numeric <= 0 || from === to) return 0;
    const fromRate = Number(ASSETS[from].kind === "fiat" ? "1" : rateFor(from));
    const toRate = Number(ASSETS[to].kind === "fiat" ? "1" : rateFor(to));
    return (numeric * fromRate) / toRate;
  }, [numeric, from, to]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <label htmlFor="calc-amount" className="text-[11.5px] font-medium text-muted">
          Amount
        </label>
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-2.5 py-2">
            <AssetIcon symbol={from} size="sm" />
            <span className="text-[13px] font-semibold text-fg">{from}</span>
            <ChevronDown className="size-3.5 text-muted" />
            <select
              aria-label="Calculator from asset"
              value={from}
              onChange={(event) => setFrom(event.target.value as AssetSymbol)}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {ASSET_SYMBOLS.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>
          <input
            id="calc-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
            className="min-w-0 flex-1 bg-transparent text-right font-mono text-[24px] font-semibold text-fg outline-none placeholder:text-muted-2"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="relative z-10 flex justify-center">
        <button
          type="button"
          onClick={swap}
          aria-label="Reverse calculator assets"
          className="-my-3 grid size-10 place-items-center rounded-full border border-line-strong bg-surface-2 text-lavender transition-colors hover:border-accent/50"
        >
          <ArrowUpDown className="size-[18px]" />
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-[11.5px] font-medium text-muted">Converted amount</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="relative flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-2.5 py-2">
            <AssetIcon symbol={to} size="sm" />
            <span className="text-[13px] font-semibold text-fg">{to}</span>
            <ChevronDown className="size-3.5 text-muted" />
            <select
              aria-label="Calculator to asset"
              value={to}
              onChange={(event) => setTo(event.target.value as AssetSymbol)}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {ASSET_SYMBOLS.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>
          <p className="min-w-0 flex-1 truncate text-right font-mono text-[24px] font-semibold text-fg">
            {from === to
              ? amount || "0"
              : new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(result)}
          </p>
        </div>
        <p className="mt-2 text-right text-[10.5px] text-muted-2">
          {from !== to && result > 0
            ? `1 ${from} ≈ ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(
                result / numeric,
              )} ${to}`
            : "Choose two different assets"}
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 text-[10.5px] leading-5 text-muted">
        The calculator uses the same simulated reference rates as the swap screen, so figures stay
        consistent across Nearvora. No live market feed is connected.
      </div>
    </div>
  );
}

function rateFor(symbol: AssetSymbol): string {
  switch (symbol) {
    case "NGN":
      return "1";
    case "USDT":
      return "1375";
    case "USDC":
      return "1374";
    case "BTC":
      return "92000000";
    case "ETH":
      return "3100000";
    case "SOL":
      return "210000";
    case "BNB":
      return "640000";
  }
}
