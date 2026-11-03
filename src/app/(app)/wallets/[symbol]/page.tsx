"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Network,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import type { PortfolioSnapshot, Transaction } from "@/lib/types/domain";
import { formatAmount, formatNgn, shortAddress } from "@/lib/money/format";
import { PageHeader, SectionHeading, Card } from "@/components/ui/card";
import { PageSkeleton, ErrorState, EmptyState } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Badge } from "@/components/ui/badge";
import { AssetIcon } from "@/components/wallets/asset-icon";
import { Sparkline } from "@/components/dashboard/sparkline";
import { TransactionList } from "@/components/transactions/transaction-list";
import { CopyButton } from "@/components/ui/copy-button";
import { ASSETS, type AssetSymbol } from "@/lib/config/assets";

export default function AssetDetailPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params?.symbol ?? "").toUpperCase() as AssetSymbol;
  const known = Object.prototype.hasOwnProperty.call(ASSETS, symbol);
  const portfolio = useApi<PortfolioSnapshot>(known ? "/api/wallets" : null);
  const transactions = useApi<Transaction[]>(known ? "/api/transactions?limit=100" : null);

  if (!known) {
    return (
      <ErrorState
        title="Unknown asset"
        message="That asset is not part of the demo wallet."
        onRetry={() => window.history.back()}
      />
    );
  }

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

  const asset = portfolio.data?.assets.find((item) => item.symbol === symbol);
  if (!asset) {
    return <ErrorState title="Wallet not found" message="This demo wallet has no balance record." />;
  }

  const assetTransactions = (transactions.data ?? []).filter(
    (transaction) => transaction.asset === symbol,
  );
  const config = ASSETS[symbol];
  const isFiat = config.kind === "fiat";

  return (
    <div className="space-y-6">
      <Link
        href="/wallets"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> All wallets
      </Link>

      <PageHeader
        eyebrow={isFiat ? "Naira wallet" : "Crypto wallet"}
        title={asset.name}
        description={config.description}
        action={
          <Badge variant="warning">
            {isFiat ? "Demo naira wallet" : "Demo custody"}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div
            className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full blur-3xl"
            style={{ backgroundColor: `${config.color}12` }}
            aria-hidden
          />
          <div className="relative flex items-center gap-3">
            <AssetIcon symbol={symbol} size="lg" />
            <div>
              <p className="text-sm font-semibold text-fg">{asset.symbol}</p>
              <p className="text-[10.5px] text-muted-2">{asset.name}</p>
            </div>
            <Sparkline className="ml-auto hidden w-28 sm:block" />
          </div>
          <p className="relative mt-5 font-mono text-[32px] font-semibold tracking-tight text-fg">
            {formatAmount(asset.available, symbol)}
          </p>
          <p className="relative mt-1 text-xs text-muted">
            ≈ {formatNgn(asset.valueNgn)} at the simulated demo rate
          </p>
          <div className="relative mt-3 flex flex-wrap gap-3 text-[10.5px] text-muted-2">
            <span>Available {formatAmount(asset.available, symbol)}</span>
            <span>Pending {formatAmount(asset.pending, symbol)}</span>
            <span>Rate {formatNgn(asset.rateNgn, { withSymbol: true })} / {symbol}</span>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-2">
            <Link
              href={`/wallets/send?asset=${symbol}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-xs font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
            >
              <ArrowUpRight className="size-3.5" /> Send
            </Link>
            <Link
              href={`/wallets/receive?asset=${symbol}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3.5 text-xs font-medium text-fg transition-colors hover:bg-surface-2"
            >
              <ArrowDownToLine className="size-3.5" /> Receive
            </Link>
            {!isFiat ? (
              <Link
                href={`/swap?from=${symbol}&to=NGN`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3.5 text-xs font-medium text-fg transition-colors hover:bg-surface-2"
              >
                <ArrowLeftRight className="size-3.5" /> Convert
              </Link>
            ) : (
              <Link
                href="/swap?from=NGN&to=USDT"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3.5 text-xs font-medium text-fg transition-colors hover:bg-surface-2"
              >
                <ArrowLeftRight className="size-3.5" /> Convert
              </Link>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Network className="size-4 text-muted" />
            <h3 className="text-sm font-semibold text-fg">Network & custody</h3>
          </div>
          <div className="mt-4 space-y-3 text-[11px]">
            <Row label="Network" value={config.networks[0]?.name ?? "Demo network"} />
            <Row label="Asset type" value={isFiat ? "Fiat balance" : "Crypto asset"} />
            <Row label="Custody" value="Demo — no live keys" />
            <Row label="Supported" value="Determined by integration config" />
          </div>
          <div className="mt-4 rounded-lg border border-line bg-surface-2 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-2">
              {isFiat ? "Virtual account (demo)" : "Receive address (demo)"}
            </p>
            <p className="mt-1 break-all font-mono text-[10.5px] leading-4 text-fg">
              {asset.address}
            </p>
            <div className="mt-2 flex gap-2">
              <CopyButton value={asset.address} label="Copy address" />
              <Link
                href={`/wallets/receive?asset=${symbol}`}
                className="inline-flex items-center gap-1 rounded-lg border border-line-strong px-2.5 py-1.5 text-[11px] text-muted hover:text-fg"
              >
                Show QR
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <section>
        <SectionHeading
          title={`${symbol} activity`}
          description={`${assetTransactions.length} demo transaction${assetTransactions.length === 1 ? "" : "s"}`}
          action={
            <Link href="/activity" className="text-[11px] font-medium text-muted hover:text-fg">
              All activity
            </Link>
          }
        />
        {assetTransactions.length === 0 && !transactions.loading ? (
          <Card className="p-4">
            <EmptyState
              title={`No ${symbol} activity`}
              description="Transactions for this asset will appear here."
            />
          </Card>
        ) : (
          <TransactionList
            transactions={assetTransactions}
            loading={transactions.loading}
            showReference
          />
        )}
      </section>

      <DemoNotice>
        {shortAddress(asset.address)} is a reserved demo identifier. It cannot receive real assets on
        any network.
      </DemoNotice>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-fg">{value}</span>
    </div>
  );
}
