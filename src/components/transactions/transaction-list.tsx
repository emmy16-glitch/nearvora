"use client";

import { ReceiptText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { EmptyState } from "@/components/ui/states";
import type { Transaction } from "@/lib/types/domain";
import { TransactionRow } from "./transaction-row";

export function TransactionList({
  transactions,
  loading,
  showReference = false,
  emptyTitle = "No transactions yet",
  emptyDescription = "Your activity will appear here after your first operation.",
}: {
  transactions: Transaction[] | null;
  loading?: boolean;
  showReference?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (loading) {
    return (
      <Card className="divide-y divide-line">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card className="p-4">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={<ReceiptText className="size-4" />}
        />
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-line overflow-hidden">
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          showReference={showReference}
        />
      ))}
    </Card>
  );
}
