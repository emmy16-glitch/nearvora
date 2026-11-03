import { ASSETS, type AssetSymbol } from "@/lib/config/assets";
import { cn } from "@/lib/utils/cn";

const glyphs: Record<AssetSymbol, string> = {
  NGN: "₦",
  USDT: "₮",
  USDC: "$",
  BTC: "₿",
  ETH: "Ξ",
};

export function AssetIcon({
  symbol,
  size = "md",
  className,
}: {
  symbol: AssetSymbol;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const asset = ASSETS[symbol];
  const sizes = {
    sm: "size-7 text-[11px]",
    md: "size-9 text-sm",
    lg: "size-12 text-lg",
  };
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border font-semibold",
        sizes[size],
        className,
      )}
      style={{
        color: asset.color,
        backgroundColor: `${asset.color}14`,
        borderColor: `${asset.color}2e`,
      }}
      aria-hidden
    >
      {glyphs[symbol]}
    </span>
  );
}
