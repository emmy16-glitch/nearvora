"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  Send,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import type { PortfolioSnapshot, Transaction } from "@/lib/types/domain";
import { formatNgn } from "@/lib/money/format";
import { DEMO_CHANGE_PERCENT, DEMO_NGN_RATES } from "@/lib/config/assets";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { useSession } from "@/components/providers";
import { Sparkline } from "@/components/dashboard/sparkline";
import { TransactionList } from "@/components/transactions/transaction-list";
import { AssetIcon } from "@/components/wallets/asset-icon";
import { PageBrandHeader } from "@/components/layout/app-shell";

const quickActions = [
  { href: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { href: "/withdraw", label: "Withdraw", icon: ArrowUpRight },
  { href: "/transfer", label: "Send", icon: Send },
  { href: "/wallets/receive", label: "Receive", icon: ArrowDownToLine },
];

const prompts = [
  "Convert ₦100,000 to USDT",
  "Send ₦50,000 to John Doe",
];

export default function DashboardPage() {
  const { user } = useSession();
  const portfolio = useApi<PortfolioSnapshot>("/api/wallets");
  const activity = useApi<Transaction[]>("/api/transactions?limit=5");
  const [hidden, setHidden] = React.useState(false);

  const data = portfolio.data;
  const firstName = user.name.split(" ")[0];
  const total = data?.totalNgn ?? "0";
  const changeAmount = Math.round(Number(total) * 0.025);
  const naira = data?.assets.find((asset) => asset.symbol === "NGN");
  const cryptoValue = data?.cryptoValueNgn ?? "0";
  const cryptoUsd = Number(cryptoValue) / 100 / Number(DEMO_NGN_RATES.USDT);
  const mask = (value: string) => (hidden ? "••••••" : value);

  return (
    <div className="space-y-6 pb-2">
      <div className="lg:hidden">
        <PageBrandHeader />
      </div>

      <div className="hidden items-start justify-between gap-4 lg:flex">
        <div>
          <p className="text-[13px] text-muted">Good evening,</p>
          <h1 className="mt-0.5 text-[28px] font-semibold tracking-tight text-fg">
            {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-[13px] text-muted">Your financial journey, simplified.</p>
        </div>
        <Link
          href="/assistant"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-soft"
        >
          <Sparkles className="size-4" /> Ask Nearvora
        </Link>
      </div>

      <div className="lg:hidden">
        <p className="text-[13px] text-muted">Good evening,</p>
        <h1 className="mt-0.5 text-[26px] font-semibold tracking-tight text-fg">
          {firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-[12.5px] text-muted">Your financial journey, simplified.</p>
      </div>

      {portfolio.loading && !data ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <section className="nv-brand-gradient relative overflow-hidden rounded-3xl border border-accent/30 p-5 text-white shadow-[0_20px_60px_-30px_rgba(91,33,182,0.9)] sm:p-6">
              <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
              <div className="relative flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-white/70">
                      Total Balance
                    </p>
                    <button
                      type="button"
                      onClick={() => setHidden((value) => !value)}
                      aria-label={hidden ? "Show balances" : "Hide balances"}
                      aria-pressed={hidden}
                      className="grid size-6 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                  <p className="mt-2 font-mono text-[clamp(1.35rem,7vw,2.25rem)] font-semibold tracking-tight">
                    {mask(formatNgn(total))}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <TrendingUp className="size-3.5 text-[#86efac]" aria-hidden />
                    <span className="font-semibold text-[#86efac]">+2.5%</span>
                    <span className="text-white/60">({mask(formatNgn(String(changeAmount)))})</span>
                    <span className="rounded-full border border-warning/30 bg-black/20 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-amber-200">
                      Demo
                    </span>
                  </div>
                </div>
                <Sparkline className="mt-6 hidden w-32 shrink-0 sm:block sm:w-40" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 sm:hidden">
                <Sparkline className="h-10 w-full opacity-80" />
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <Link
                href="/wallets?tab=naira"
                className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2/70"
              >
                <div className="flex items-center gap-2.5">
                  <AssetIcon symbol="NGN" size="sm" />
                  <p className="text-[11.5px] text-muted">Naira Balance</p>
                </div>
                <p className="mt-3 font-mono text-[15px] font-semibold text-fg sm:text-base">
                  {mask(formatNgn(naira?.available ?? "0"))}
                </p>
                <p className="mt-1 text-[10px] text-muted-2">
                  Pending {mask(formatNgn(naira?.pending ?? "0"))}
                </p>
              </Link>
              <Link
                href="/wallets?tab=crypto"
                className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2/70"
              >
                <div className="flex items-center gap-2.5">
                  <AssetIcon symbol="USDT" size="sm" />
                  <p className="text-[11.5px] text-muted">Crypto Balance</p>
                </div>
                <p className="mt-3 font-mono text-[15px] font-semibold text-fg sm:text-base">
                  {hidden
                    ? "••••••"
                    : `$${cryptoUsd.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </p>
                <p className="mt-1 text-[10px] text-muted-2">
                  ≈ {mask(formatNgn(cryptoValue))}
                </p>
              </Link>
            </section>

            <section className="grid grid-cols-4 gap-2.5 sm:gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex flex-col items-center gap-2.5 rounded-2xl border border-line bg-surface px-1 py-4 transition-colors hover:border-accent/30 hover:bg-surface-2"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-accent/12 text-lavender transition-colors group-hover:bg-accent group-hover:text-white">
                      <Icon className="size-[18px]" strokeWidth={2} />
                    </span>
                    <span className="text-[10.5px] font-medium text-muted group-hover:text-fg">
                      {action.label}
                    </span>
                  </Link>
                );
              })}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-fg">Recent Activity</h2>
                <Link
                  href="/activity"
                  className="inline-flex items-center gap-1 text-[11.5px] font-medium text-lavender hover:underline"
                >
                  View all <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
              <TransactionList
                transactions={activity.data}
                loading={activity.loading}
                emptyTitle="No activity yet"
              />
            </section>
          </div>

          <aside className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl border border-accent/25 bg-accent/12">
                    <Sparkles className="size-4 text-lavender" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-fg">Nearvora AI</p>
                    <p className="text-[10px] text-muted-2">Ask in plain language</p>
                  </div>
                </div>
                <Badge variant="accent">Assistant</Badge>
              </div>
              <p className="mt-4 text-[12.5px] leading-5 text-muted">
                Describe what you want to do. The assistant prepares a plan and waits for your
                approval. Nothing moves without you.
              </p>
              <div className="mt-3 space-y-2">
                {prompts.map((prompt) => (
                  <Link
                    key={prompt}
                    href={`/assistant?prompt=${encodeURIComponent(prompt)}`}
                    className="group flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5 text-[11px] text-muted transition-colors hover:border-accent/30 hover:text-fg"
                  >
                    <span>{prompt}</span>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-2 group-hover:text-lavender" />
                  </Link>
                ))}
              </div>
              <Link
                href="/assistant"
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-lavender hover:underline"
              >
                Open assistant <ArrowUpRight className="size-3.5" />
              </Link>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-fg">Today&apos;s rates</h2>
                <Link
                  href="/rates"
                  className="text-[11px] font-medium text-lavender hover:underline"
                >
                  All rates
                </Link>
              </div>
              <div className="mt-3 space-y-1">
                {(["USDT", "BTC", "ETH"] as const).map((symbol) => (
                  <Link
                    key={symbol}
                    href="/rates"
                    className="flex items-center gap-2.5 rounded-lg px-1 py-2 transition-colors hover:bg-surface-2"
                  >
                    <AssetIcon symbol={symbol} size="xs" />
                    <span className="flex-1 text-[11.5px] font-medium text-fg">{symbol}</span>
                    <span className="font-mono text-[11px] text-muted">
                      ₦{Number(DEMO_NGN_RATES[symbol]).toLocaleString("en-US")}
                    </span>
                    <span className="w-12 text-right text-[10px] font-medium text-success">
                      +{DEMO_CHANGE_PERCENT[symbol].toFixed(1)}%
                    </span>
                  </Link>
                ))}
              </div>
              <p className="mt-2 text-[9.5px] text-muted-2">Simulated demonstration rates.</p>
            </section>

            <Link
              href="/swap"
              className="flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent/8 p-4 transition-colors hover:bg-accent/12"
            >
              <span className="grid size-10 place-items-center rounded-full bg-accent text-white">
                <ArrowLeftRight className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-fg">Swap & Convert</span>
                <span className="block text-[10.5px] text-muted">Naira ↔ crypto, instantly</span>
              </span>
              <ChevronRight className="size-4 text-muted" />
            </Link>
          </aside>
        </div>
      )}

      <DemoNotice>
        Balances and the 30-day change are computed from simulated demo rates. No real funds are
        held or moved.
      </DemoNotice>
    </div>
  );
}
