"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  CheckCircle2,
  Share2,
  Wallet,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import type { PortfolioSnapshot, Transaction } from "@/lib/types/domain";
import { ASSETS, type AssetSymbol } from "@/lib/config/assets";
import { formatAmount, relativeTime } from "@/lib/money/format";
import { PageHeader, Card } from "@/components/ui/card";
import { PageSkeleton, ErrorState, Skeleton } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { AssetIcon } from "@/components/wallets/asset-icon";

interface VirtualAccount {
  provider: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  simulated: boolean;
  note: string;
}

function ReceiveClient() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const portfolio = useApi<PortfolioSnapshot>("/api/wallets");
  const virtual = useApi<VirtualAccount>("/api/payments/virtual-account");
  const transactions = useApi<Transaction[]>("/api/transactions?limit=50");

  const initial = (searchParams.get("asset") ?? "USDT").toUpperCase();
  const [symbol, setSymbol] = React.useState<AssetSymbol>(
    Object.prototype.hasOwnProperty.call(ASSETS, initial) ? (initial as AssetSymbol) : "USDT",
  );
  const [networkId, setNetworkId] = React.useState(ASSETS[symbol].networks[0]?.id ?? "");

  React.useEffect(() => {
    setNetworkId(ASSETS[symbol].networks[0]?.id ?? "");
  }, [symbol]);

  if (portfolio.loading && !portfolio.data) return <PageSkeleton />;
  if (portfolio.error && !portfolio.data) {
    return (
      <ErrorState
        title="Wallet data could not be loaded"
        message={portfolio.error.message}
        onRetry={() => portfolio.refetch()}
      />
    );
  }

  const asset = portfolio.data?.assets.find((item) => item.symbol === symbol);
  const config = ASSETS[symbol];
  const isFiat = config.kind === "fiat";
  const selectedNetwork = config.networks.find((network) => network.id === networkId);
  const address = asset?.address ?? "demo_address_unavailable";

  const qrValue = isFiat
    ? `Nearvora demo virtual account\nBank: ${virtual.data?.bankName ?? "Nearvora Demo Bank"}\nAccount: ${virtual.data?.accountNumber ?? "0000000000"}\nName: ${virtual.data?.accountName ?? "DEMO"}`
    : `nearvora://demo/receive?asset=${symbol}&network=${networkId}&address=${encodeURIComponent(address)}`;

  const deposits = (transactions.data ?? []).filter(
    (transaction) =>
      transaction.asset === symbol &&
      (transaction.type === "crypto_receive" || transaction.type === "deposit"),
  );

  const share = async () => {
    const text = isFiat
      ? `Nearvora demo account — ${virtual.data?.bankName} ${virtual.data?.accountNumber}`
      : `Nearvora demo ${symbol} address (${selectedNetwork?.name}): ${address}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Nearvora demo ${symbol} receive address`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "Share text copied.", variant: "success" });
      }
    } catch {
      // user dismissed share sheet
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/wallets"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> All wallets
      </Link>

      <PageHeader
        eyebrow="Receive"
        title="Receive funds"
        description="Choose an asset and network. Every address in this build is a clearly labelled demo identifier."
        action={<Badge variant="warning">Demo address</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Asset"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value as AssetSymbol)}
            >
              {(Object.keys(ASSETS) as AssetSymbol[]).map((key) => (
                <option key={key} value={key}>
                  {ASSETS[key].symbol} — {ASSETS[key].name}
                </option>
              ))}
            </Select>
            <Select
              label="Network"
              value={networkId}
              onChange={(event) => setNetworkId(event.target.value)}
              disabled={isFiat}
            >
              {config.networks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-6 flex flex-col items-center rounded-xl border border-line bg-surface-2/60 p-5">
            <div className="rounded-xl bg-white p-3">
              <QRCode value={qrValue} size={168} bgColor="#ffffff" fgColor="#07080a" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <AssetIcon symbol={symbol} size="sm" />
              <p className="text-sm font-semibold text-fg">
                {isFiat ? "Nearvora demo virtual account" : `${symbol} · ${selectedNetwork?.name}`}
              </p>
            </div>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-warning">
              Simulated · not a real deposit address
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-line bg-surface p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-2">
              {isFiat ? "Account details" : "Address"}
            </p>
            {isFiat ? (
              <div className="mt-2 space-y-2 text-[11.5px]">
                {virtual.loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <DetailRow label="Bank" value={virtual.data?.bankName ?? "Demo bank"} />
                    <DetailRow
                      label="Account number"
                      value={virtual.data?.accountNumber ?? "0000000000"}
                    />
                    <DetailRow label="Account name" value={virtual.data?.accountName ?? "DEMO"} />
                  </>
                )}
              </div>
            ) : (
              <p className="mt-2 break-all font-mono text-[11px] leading-5 text-fg">{address}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton
                value={
                  isFiat
                    ? `${virtual.data?.bankName} / ${virtual.data?.accountNumber} / ${virtual.data?.accountName}`
                    : address
                }
              />
              <Button variant="outline" size="sm" onClick={share}>
                <Share2 className="size-3.5" /> Share
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning/5 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-[10.5px] leading-4 text-warning/90">
              Only send <strong className="text-warning">{symbol}</strong> on{" "}
              <strong className="text-warning">{selectedNetwork?.name ?? "the selected network"}</strong>{" "}
              in a live integration. This demo identifier is not valid on any blockchain and cannot
              receive real funds.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-muted" />
              <h3 className="text-sm font-semibold text-fg">Available to receive</h3>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Asset</span>
                <span className="text-[11px] font-medium text-fg">{symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Network</span>
                <span className="text-[11px] font-medium text-fg">
                  {selectedNetwork?.name ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Current balance</span>
                <span className="font-mono text-[11px] font-medium text-fg">
                  {formatAmount(asset?.available ?? "0", symbol)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Deposit status</span>
                <StatusBadge status="pending" />
              </div>
            </div>
            <p className="mt-4 text-[10px] leading-4 text-muted-2">
              In demo mode a deposit is simulated through the Naira flow or a seeded crypto balance.
              No chain watcher is connected.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="size-4 text-muted" />
              <h3 className="text-sm font-semibold text-fg">Recent deposits</h3>
            </div>
            <div className="mt-3 space-y-2">
              {deposits.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-3 py-5 text-center text-[10.5px] text-muted-2">
                  No demo deposits for {symbol} yet.
                </p>
              ) : (
                deposits.slice(0, 4).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] text-fg">{transaction.title}</p>
                        <p className="text-[9.5px] text-muted-2">
                          {relativeTime(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10.5px] text-success">
                      +{formatAmount(transaction.amount, transaction.asset)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <DemoNotice>
        QR codes encode demo text, not live chain payment URIs. Do not scan them with a real wallet
        expecting a transfer.
      </DemoNotice>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-fg">{value}</span>
    </div>
  );
}

export default function ReceivePage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <ReceiveClient />
    </React.Suspense>
  );
}
