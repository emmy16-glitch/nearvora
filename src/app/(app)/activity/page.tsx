"use client";

import * as React from "react";
import { Download, Repeat } from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import type { Transaction } from "@/lib/types/domain";
import { PageHeader, Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/input";
import { PageSkeleton, ErrorState } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Badge } from "@/components/ui/badge";
import { TransactionList } from "@/components/transactions/transaction-list";

type StatusFilter = "all" | "pending" | "completed" | "failed";

const typeOptions = [
  { value: "all", label: "All types" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "transfer", label: "Transfers" },
  { value: "swap", label: "Swaps" },
  { value: "bill_payment", label: "Bill payments" },
  { value: "crypto_receive", label: "Crypto received" },
  { value: "crypto_send", label: "Crypto sent" },
];

export default function ActivityPage() {
  const transactions = useApi<Transaction[]>("/api/transactions?limit=100");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [type, setType] = React.useState("all");
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const list = transactions.data ?? [];
    return list.filter((transaction) => {
      if (status !== "all") {
        if (status === "pending") {
          if (transaction.status !== "pending" && transaction.status !== "processing") return false;
        } else if (transaction.status !== status) {
          return false;
        }
      }
      if (type !== "all" && transaction.type !== type) return false;
      if (query.trim()) {
        const needle = query.trim().toLowerCase();
        const haystack = `${transaction.title} ${transaction.description} ${transaction.reference} ${transaction.counterparty ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [transactions.data, status, type, query]);

  if (transactions.loading && !transactions.data) return <PageSkeleton />;
  if (transactions.error && !transactions.data) {
    return (
      <ErrorState
        title="Activity could not be loaded"
        message={transactions.error.message}
        onRetry={() => transactions.refetch()}
      />
    );
  }

  const all = transactions.data ?? [];
  const pending = all.filter(
    (transaction) => transaction.status === "pending" || transaction.status === "processing",
  ).length;
  const completed = all.filter((transaction) => transaction.status === "completed").length;
  const failed = all.filter((transaction) => transaction.status === "failed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ledger activity"
        title="Activity"
        description="Every demo transaction with its reference, asset, amount and status. Use filters to narrow the list."
        action={<Badge variant="warning">Simulated ledger</Badge>}
      />

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-2">Completed</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-success">{completed}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-2">In progress</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-warning">{pending}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-2">Failed</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-danger">{failed}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[
            { value: "all", label: "All", count: all.length },
            { value: "pending", label: "In progress", count: pending },
            { value: "completed", label: "Completed", count: completed },
            { value: "failed", label: "Failed", count: failed },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reference or recipient"
            className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-xs text-fg outline-none placeholder:text-muted-2 focus:border-accent/50 sm:w-56"
            aria-label="Search transactions"
          />
          <Select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filter by transaction type"
            className="h-9 w-full sm:w-40"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <TransactionList
        transactions={filtered}
        loading={transactions.loading}
        showReference
        emptyTitle="No matching transactions"
        emptyDescription="Try a different filter or search term."
      />

      <div className="flex flex-wrap gap-2">
        {/* API route: full reload is intentional for the raw JSON feed. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/transactions?limit=100"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[10.5px] text-muted transition-colors hover:text-fg"
        >
          <Download className="size-3" /> View JSON feed
        </a>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[10.5px] text-muted-2">
          <Repeat className="size-3" /> Backend ledger
        </span>
      </div>

      <DemoNotice>
        These entries come from the in-memory demo ledger. They are not bank statements or on-chain
        records.
      </DemoNotice>
    </div>
  );
}
