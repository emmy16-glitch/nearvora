"use client";

import Link from "next/link";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpRight, Eye, Send } from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import type { PortfolioSnapshot } from "@/lib/types/domain";
import { formatNgn } from "@/lib/money/format";
import { PageHeader, SectionHeading, Card } from "@/components/ui/card";
import { PageSkeleton, ErrorState } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Badge } from "@/components/ui/badge";
import { WalletList } from "@/components/wallets/wallet-list";

export default function WalletsPage() {
  const portfolio = useApi<PortfolioSnapshot>("/api/wallets");

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

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Wallet system"
        title="Wallets"
        description="Naira and crypto in one place. Balances, addresses and networks are clearly labelled demo data."
        action={
          <>
            <Link
              href="/wallets/receive"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
            >
              <ArrowDownToLine className="size-4" /> Receive
            </Link>
            <Link
              href="/wallets/send"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
            >
              <Send className="size-4" /> Send
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted">Total value</p>
          <p className="mt-2 font-mono text-xl font-semibold text-fg">
            {formatNgn(data?.totalNgn ?? "0")}
          </p>
          <Badge variant="warning" className="mt-2">
            Simulated
          </Badge>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted">Naira available</p>
          <p className="mt-2 font-mono text-xl font-semibold text-fg">
            {formatNgn(data?.nairaAvailable ?? "0")}
          </p>
          <p className="mt-2 text-[10.5px] text-muted-2">
            Pending {formatNgn(data?.nairaPending ?? "0")}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted">Crypto value</p>
          <p className="mt-2 font-mono text-xl font-semibold text-fg">
            {formatNgn(data?.cryptoValueNgn ?? "0")}
          </p>
          <p className="mt-2 text-[10.5px] text-muted-2">At simulated NGN rates</p>
        </Card>
      </div>

      <section>
        <SectionHeading
          title="Naira wallet"
          description="NGN · 2 decimal places · demo provider"
          action={
            <Link href="/wallets/NGN" className="text-[11px] font-medium text-muted hover:text-fg">
              Open wallet
            </Link>
          }
        />
        <Card className="p-5">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-full border border-success/25 bg-success/10 text-sm font-semibold text-success">
                  ₦
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg">Nigerian Naira</p>
                  <p className="text-[10.5px] text-muted-2">Nigerian bank transfer · demo</p>
                </div>
              </div>
              <p className="mt-4 font-mono text-[28px] font-semibold tracking-tight text-fg">
                {formatNgn(data?.nairaAvailable ?? "0")}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-muted-2">
                <Eye className="size-3" /> Pending {formatNgn(data?.nairaPending ?? "0")}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:w-64">
              {[
                { href: "/deposit", label: "Deposit", icon: ArrowDownToLine },
                { href: "/withdraw", label: "Withdraw", icon: ArrowUpRight },
                { href: "/transfer", label: "Transfer", icon: Send },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface-2 py-3 text-[10px] font-medium text-muted transition-colors hover:text-fg"
                  >
                    <Icon className="size-3.5" />
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Crypto assets"
          description="Demo custody · no live chain keys"
          action={
            <Link href="/swap" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-fg">
              <ArrowLeftRight className="size-3" /> Swap
            </Link>
          }
        />
        <WalletList assets={data?.assets ?? null} showFiat={false} />
      </section>

      <section>
        <SectionHeading title="All assets" />
        <WalletList assets={data?.assets ?? null} />
      </section>

      <DemoNotice>
        Wallet addresses are reserved demo strings, not valid blockchain addresses. Never send real
        crypto to them.
      </DemoNotice>
    </div>
  );
}
