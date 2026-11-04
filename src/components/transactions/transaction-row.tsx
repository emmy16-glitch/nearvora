import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Landmark,
  ReceiptText,
  Send,
  Smartphone,
  Wallet,
  Wifi,
} from "lucide-react";
import { formatAmount, relativeTime } from "@/lib/money/format";
import type { Transaction, TransactionType } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

const typeIcons: Record<TransactionType, typeof Send> = {
  deposit: ArrowDownLeft,
  withdrawal: Landmark,
  transfer: Send,
  swap: ArrowLeftRight,
  bill_payment: ReceiptText,
  airtime: Smartphone,
  data: Wifi,
  crypto_receive: ArrowDownLeft,
  crypto_send: ArrowUpRight,
};

function iconTone(transaction: Transaction) {
  if (transaction.direction === "in") return "bg-success/12 text-success";
  if (transaction.type === "swap") return "bg-accent/15 text-lavender";
  if (transaction.type === "withdrawal" || transaction.type === "bill_payment" || transaction.type === "airtime" || transaction.type === "data") {
    return "bg-[#f59e0b]/12 text-[#fbbf24]";
  }
  return "bg-accent/12 text-lavender";
}

export function TransactionRow({
  transaction,
  showReference = false,
}: {
  transaction: Transaction;
  showReference?: boolean;
}) {
  const Icon = typeIcons[transaction.type] ?? Wallet;
  const signed =
    transaction.direction === "in" ? "+" : transaction.direction === "out" ? "−" : "";
  const amountClass =
    transaction.status === "failed"
      ? "text-muted line-through"
      : transaction.direction === "in"
        ? "text-success"
        : transaction.direction === "out"
          ? "text-[#fca5a5]"
          : "text-fg";

  return (
    <Link
      href={`/transactions/${transaction.id}`}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/60"
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full",
          iconTone(transaction),
        )}
      >
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-fg">{transaction.title}</span>
          {transaction.simulated ? (
            <span className="shrink-0 rounded border border-warning/20 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-warning/80">
              Demo
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-2">
          <span className="truncate">{transaction.description}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{relativeTime(transaction.createdAt)}</span>
        </span>
        {showReference ? (
          <span className="mt-1 block font-mono text-[9.5px] text-muted-2">
            {transaction.reference}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className={cn("font-mono text-[12.5px] font-semibold", amountClass)}>
          {signed}
          {formatAmount(transaction.amount, transaction.asset)}
        </span>
        {transaction.status !== "completed" ? (
          <span className="mt-0.5 text-[9.5px] capitalize text-muted-2">{transaction.status}</span>
        ) : null}
      </span>
    </Link>
  );
}
