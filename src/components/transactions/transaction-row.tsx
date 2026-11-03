import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ReceiptText,
  Send,
  Smartphone,
  Wallet,
  Wifi,
} from "lucide-react";
import { formatAmount, relativeTime } from "@/lib/money/format";
import type { Transaction, TransactionType } from "@/lib/types/domain";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const typeIcons: Record<TransactionType, typeof Send> = {
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  transfer: Send,
  swap: ArrowLeftRight,
  bill_payment: ReceiptText,
  airtime: Smartphone,
  data: Wifi,
  crypto_receive: ArrowDownLeft,
  crypto_send: ArrowUpRight,
};

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
        : "text-fg";

  return (
    <Link
      href={`/transactions/${transaction.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-muted">
        <Icon className="size-4" />
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
          <span>{relativeTime(transaction.createdAt)}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{transaction.description}</span>
        </span>
        {showReference ? (
          <span className="mt-1 block font-mono text-[9.5px] text-muted-2">
            {transaction.reference}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={cn("font-mono text-xs font-medium", amountClass)}>
          {signed}
          {formatAmount(transaction.amount, transaction.asset)}
        </span>
        <StatusBadge status={transaction.status} />
      </span>
    </Link>
  );
}
