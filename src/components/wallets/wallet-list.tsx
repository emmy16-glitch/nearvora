import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatAmount, formatNgn } from "@/lib/money/format";
import type { WalletAssetView } from "@/lib/types/domain";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { AssetIcon } from "./asset-icon";

export function WalletList({
  assets,
  loading,
  showFiat = true,
}: {
  assets: WalletAssetView[] | null;
  loading?: boolean;
  showFiat?: boolean;
}) {
  if (loading) {
    return (
      <Card className="divide-y divide-line">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </Card>
    );
  }

  const visible = (assets ?? []).filter((asset) => showFiat || asset.kind !== "fiat");

  return (
    <Card className="divide-y divide-line overflow-hidden">
      {visible.map((asset) => (
        <Link
          key={asset.symbol}
          href={`/wallets/${asset.symbol}`}
          className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/60"
        >
          <AssetIcon symbol={asset.symbol} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-medium text-fg">{asset.symbol}</p>
              {asset.kind === "crypto" ? (
                <span className="rounded border border-line px-1 py-px text-[8.5px] uppercase tracking-wider text-muted-2">
                  Demo network
                </span>
              ) : null}
            </div>
            <p className="truncate text-[10.5px] text-muted-2">{asset.name}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-xs font-medium text-fg">
              {formatAmount(asset.available, asset.symbol)}
            </p>
            <p className="mt-0.5 text-[10.5px] text-muted-2">
              {asset.symbol === "NGN" ? "Available" : formatNgn(asset.valueNgn)}
            </p>
          </div>
          <ChevronRight className="size-3.5 shrink-0 text-muted-2" />
        </Link>
      ))}
    </Card>
  );
}
