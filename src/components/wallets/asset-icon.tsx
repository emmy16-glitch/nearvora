import { ASSETS, type AssetSymbol } from "@/lib/config/assets";
import { cn } from "@/lib/utils/cn";

const sizes = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

function Glyph({ symbol }: { symbol: AssetSymbol }) {
  switch (symbol) {
    case "NGN":
      return (
        <span className="text-[13px] font-bold leading-none text-white">₦</span>
      );
    case "USDT":
      return (
        <svg viewBox="0 0 24 24" className="size-[62%]" aria-hidden>
          <path
            d="M12 2 2 7v10l10 5 10-5V7L12 2Zm0 2.3 7.8 3.9v7.6L12 19.7 4.2 15.8V8.2L12 4.3Z"
            fill="currentColor"
            opacity="0.35"
          />
          <path
            d="M7 8.5h10v2h-4v7h-2v-7H7v-2Z"
            fill="currentColor"
          />
        </svg>
      );
    case "USDC":
      return (
        <svg viewBox="0 0 24 24" className="size-[68%]" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 6.5v11M14.9 8.7c-.6-.6-1.6-1-2.9-1-1.6 0-3 .8-3 2.1 0 1.5 1.4 1.9 3 2.3 1.7.4 3 .9 3 2.3 0 1.3-1.4 2.1-3 2.1-1.4 0-2.5-.4-3.1-1.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "BTC":
      return (
        <svg viewBox="0 0 24 24" className="size-[64%]" aria-hidden>
          <path
            d="M9 5.5h4.2c2 0 3.4 1.1 3.4 2.8 0 1.2-.7 2-1.8 2.4 1.4.3 2.3 1.3 2.3 2.7 0 2-1.6 3.2-3.9 3.2H9V5.5Zm2.2 4.4h1.7c1 0 1.6-.5 1.6-1.3 0-.8-.6-1.2-1.6-1.2h-1.7v2.5Zm0 4.9h2c1.1 0 1.8-.5 1.8-1.4 0-.9-.7-1.4-1.8-1.4h-2v2.8Z"
            fill="currentColor"
          />
          <path
            d="M10.4 3.7h1.4v2h-1.4v-2Zm3 0h1.4v2h-1.4v-2Zm-3 14.1h1.4v2h-1.4v-2Zm3 0h1.4v2h-1.4v-2Z"
            fill="currentColor"
          />
        </svg>
      );
    case "ETH":
      return (
        <svg viewBox="0 0 24 24" className="size-[60%]" aria-hidden>
          <path d="M12 3.2 6.4 12l5.6 3.3 5.6-3.3L12 3.2Z" fill="currentColor" />
          <path d="M12 16.4 6.4 13.1 12 20.8l5.6-7.7-5.6 3.3Z" fill="currentColor" opacity="0.7" />
        </svg>
      );
    case "SOL":
      return (
        <svg viewBox="0 0 24 24" className="size-[70%]" aria-hidden>
          <path d="M7.3 6.8h9.3l-2.2 2.4H5.1l2.2-2.4Z" fill="currentColor" />
          <path d="M7.3 10.8h9.3l-2.2 2.4H5.1l2.2-2.4Z" fill="currentColor" opacity="0.75" />
          <path d="M7.3 14.8h9.3l-2.2 2.4H5.1l2.2-2.4Z" fill="currentColor" opacity="0.5" />
        </svg>
      );
    case "BNB":
      return (
        <svg viewBox="0 0 24 24" className="size-[62%]" aria-hidden>
          <path d="m12 3 2.6 2.6L12 8.2 9.4 5.6 12 3Zm5.6 5.6L20.2 11l-2.6 2.6L15 11l2.6-2.4ZM6.4 8.6 9 11l-2.6 2.6L3.8 11l2.6-2.4ZM12 9.6l2.4 2.4-2.4 2.4L9.6 12 12 9.6Zm0 6.2 2.6 2.6L12 21l-2.6-2.6 2.6-2.6Z" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

export function AssetIcon({
  symbol,
  size = "md",
  className,
  flat = false,
}: {
  symbol: AssetSymbol;
  size?: keyof typeof sizes;
  className?: string;
  flat?: boolean;
}) {
  const asset = ASSETS[symbol];
  const isEth = symbol === "ETH";
  const background = isEth ? "#5b6ee1" : asset.color;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-white",
        !flat && "ring-1 ring-white/10",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: background }}
      aria-hidden
    >
      <Glyph symbol={symbol} />
    </span>
  );
}
