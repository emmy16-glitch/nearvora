"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronRight,
  Landmark,
  QrCode,
  Send,
  Wallet,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import type { PortfolioSnapshot, Transaction } from "@/lib/types/domain";
import { formatAmount, formatNgn } from "@/lib/money/format";
import { SegmentedTabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton, ErrorState } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { TransactionList } from "@/components/transactions/transaction-list";
import { AssetIcon } from "@/components/wallets/asset-icon";
import { NotificationBell } from "@/components/layout/app-shell";

type WalletTab = "naira" | "crypto";

const nairaActions = [
  { href: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { href: "/withdraw", label: "Withdraw", icon: ArrowUpRight },
  { href: "/transfer", label: "Transfer", icon: Send },
];

const cryptoActions = [
  { href: "/wallets/receive", label: "Deposit", icon: ArrowDownToLine },
  { href: "/wallets/send", label: "Withdraw", icon: ArrowUpRight },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
];

function WalletsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portfolio = useApi<PortfolioSnapshot>("/api/wallets");
  const transactions = useApi<Transaction[]>("/api/transactions?limit=50");

  const initial = searchParams.get("tab") === "crypto" ? "crypto" : "naira";
  const [tab, setTab] = React.useState<WalletTab>(initial);

  React.useEffect(() => {
    const next = searchParams.get("tab") === "crypto" ? "crypto" : "naira";
    setTab(next);
  }, [searchParams]);

  const switchTab = (value: WalletTab) => {
    setTab(value);
    router.replace(`/wallets?tab=${value}`, { scroll: false });
  };

  if (portfolio.loading && !portfolio.data) return <PageSkeleton />;
  if (portfolio.error && !portfolio.data) {
    return (
      <ErrorState
        title="Wallets could not be loaded"
        message={portfolio.error.message}
        onRetry={() => portfolio.refetch()}
      />
    );
  }

  const data = portfolio.data;
  const naira = data?.assets.find((asset) => asset.symbol === "NGN");
  const cryptoAssets = (data?.assets ?? []).filter((asset) => asset.kind === "crypto");
  const cryptoTotal = data?.cryptoValueNgn ?? "0";
  const nairaHistory = (transactions.data ?? []).filter((tx) => tx.asset === "NGN");
  const cryptoHistory = (transactions.data ?? []).filter((tx) => tx.asset !== "NGN");
  const actions = tab === "naira" ? nairaActions : cryptoActions;

  return (
    <div className="space-y-5 pb-2">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-fg sm:text-[28px]">
            Wallets
          </h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Naira and crypto, one clear view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/wallets/receive"
            className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:text-fg"
            aria-label="Scan or show a receive address"
          >
            <QrCode className="size-[18px]" />
          </Link>
          <NotificationBell className="lg:hidden" />
        </div>
      </header>

      <SegmentedTabs
        tabs={[
          { value: "naira", label: "Naira Wallet" },
          { value: "crypto", label: "Crypto Wallets" },
        ]}
        value={tab}
        onChange={switchTab}
      />

      {tab === "naira" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="min-w-0 space-y-4">
            <Link
              href="/wallets/NGN"
              className="nv-brand-gradient relative block overflow-hidden rounded-3xl border border-accent/30 p-5 text-white shadow-[0_20px_60px_-34px_rgba(91,33,182,0.9)]"
            >
              <div className="pointer-events-none absolute -right-8 -top-16 size-52 rounded-full bg-white/10 blur-3xl" aria-hidden />
              <div className="relative flex items-center gap-3.5">
                <span className="grid size-11 place-items-center rounded-xl border border-white/15 bg-white/10">
                  <Landmark className="size-5" />
                </span>
                <div>
                  <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-white/70">
                    Naira Balance
                  </p>
                  <p className="mt-1 font-mono text-[26px] font-semibold tracking-tight sm:text-[30px]">
                    {formatNgn(naira?.available ?? "0")}
                  </p>
                </div>
                <ChevronRight className="ml-auto size-5 text-white/60" />
              </div>
              <div className="relative mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/70">
                <span>Available: {formatNgn(naira?.available ?? "0")}</span>
                <span className="text-white/30">|</span>
                <span>Pending: {formatNgn(naira?.pending ?? "0")}</span>
              </div>
            </Link>

            <div className="grid grid-cols-3 gap-2.5">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex flex-col items-center gap-2.5 rounded-2xl border border-line bg-surface px-1 py-4 transition-colors hover:border-accent/30 hover:bg-surface-2"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-accent/12 text-lavender transition-colors group-hover:bg-accent group-hover:text-white">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="text-[10.5px] font-medium text-muted group-hover:text-fg">
                      {action.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-lavender" />
                <p className="text-[12px] font-semibold text-fg">Naira account</p>
                <Badge variant="success" className="ml-auto">
                  Active
                </Badge>
              </div>
              <div className="mt-3 space-y-2 text-[11px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Settlement</span>
                  <span className="font-medium text-fg">Nigerian bank transfer</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Withdrawal fee</span>
                  <span className="font-mono font-medium text-fg">₦100.00</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Demo virtual account</span>
                  <Link href="/deposit" className="font-medium text-lavender hover:underline">
                    View details
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <section className="min-w-0 rounded-2xl border border-line bg-surface/60 p-1">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-[14px] font-semibold text-fg">Transaction History</h2>
              <Link
                href="/activity"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-lavender hover:underline"
              >
                View all <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <TransactionList
                transactions={nairaHistory}
                loading={transactions.loading}
                emptyTitle="No Naira activity yet"
              />
            </div>
          </section>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="min-w-0 space-y-4">
            <div className="nv-brand-gradient relative overflow-hidden rounded-3xl border border-accent/30 p-5 text-white shadow-[0_20px_60px_-34px_rgba(91,33,182,0.9)]">
              <div className="pointer-events-none absolute -right-8 -top-16 size-52 rounded-full bg-white/10 blur-3xl" aria-hidden />
              <div className="relative flex items-center gap-3.5">
                <AssetIcon symbol="USDT" size="md" />
                <div>
                  <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-white/70">
                    Crypto Balance
                  </p>
                  <p className="mt-1 font-mono text-[26px] font-semibold tracking-tight sm:text-[30px]">
                    {formatNgn(cryptoTotal)}
                  </p>
                </div>
              </div>
              <p className="relative mt-3 text-[11px] text-white/70">
                {cryptoAssets.filter((asset) => asset.available !== "0").length} funded assets · demo
                custody
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex flex-col items-center gap-2.5 rounded-2xl border border-line bg-surface px-1 py-4 transition-colors hover:border-accent/30 hover:bg-surface-2"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-accent/12 text-lavender transition-colors group-hover:bg-accent group-hover:text-white">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="text-[10.5px] font-medium text-muted group-hover:text-fg">
                      {action.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-fg">Crypto Wallets</h2>
                <Link
                  href="/rates"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-lavender hover:underline"
                >
                  Rates <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                {cryptoAssets.map((asset) => (
                  <Link
                    key={asset.symbol}
                    href={`/wallets/${asset.symbol}`}
                    className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0 transition-colors hover:bg-surface-2/60"
                  >
                    <AssetIcon symbol={asset.symbol} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-fg">{asset.symbol}</p>
                      <p className="truncate text-[10.5px] text-muted-2">{asset.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-[12.5px] font-semibold text-fg">
                        {formatAmount(asset.available, asset.symbol)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-2">≈ {formatNgn(asset.valueNgn)}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-2" />
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <section className="min-w-0 rounded-2xl border border-line bg-surface/60 p-1">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-[14px] font-semibold text-fg">Crypto activity</h2>
              <Link
                href="/activity"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-lavender hover:underline"
              >
                View all <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <TransactionList
                transactions={cryptoHistory}
                loading={transactions.loading}
                emptyTitle="No crypto activity yet"
              />
            </div>
          </section>
        </div>
      )}

      <DemoNotice>
        Demo wallets only. Balances, addresses and networks are simulated and reset when the demo
        data is reset.
      </DemoNotice>
    </div>
  );
}

export default function WalletsPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <WalletsClient />
    </React.Suspense>
  );
}
