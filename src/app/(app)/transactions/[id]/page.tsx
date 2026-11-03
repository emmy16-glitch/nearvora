"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock,
  FlaskConical,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import type { Transaction } from "@/lib/types/domain";
import { formatAmount, formatDateTime, formatNgn } from "@/lib/money/format";
import { convertMinor } from "@/lib/money/money";
import { DEMO_NGN_RATES } from "@/lib/config/assets";
import { PageHeader, Card } from "@/components/ui/card";
import { PageSkeleton, ErrorState } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ASSETS } from "@/lib/config/assets";

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const transaction = useApi<Transaction>(params?.id ? `/api/transactions/${params.id}` : null);

  if (transaction.loading && !transaction.data) return <PageSkeleton />;
  if (transaction.error && !transaction.data) {
    return (
      <ErrorState
        title="Transaction not found"
        message={transaction.error.message}
        onRetry={() => transaction.refetch()}
      />
    );
  }

  const tx = transaction.data;
  if (!tx) return <ErrorState title="Transaction not found" />;

  const config = ASSETS[tx.asset];
  const signed = tx.direction === "in" ? "+" : tx.direction === "out" ? "−" : "";
  const amountColor =
    tx.status === "failed"
      ? "text-muted"
      : tx.direction === "in"
        ? "text-success"
        : tx.direction === "out"
          ? "text-fg"
          : "text-fg";

  return (
    <div className="space-y-6">
      <Link
        href="/activity"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> Activity
      </Link>

      <PageHeader
        eyebrow="Transaction detail"
        title={tx.title}
        description={tx.description}
        action={<StatusBadge status={tx.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <Badge variant="warning">
              <FlaskConical className="size-2.5" /> Simulated transaction
            </Badge>
            <span className="text-[10px] text-muted-2">{formatDateTime(tx.createdAt)}</span>
          </div>
          <p className={`mt-6 font-mono text-[34px] font-semibold tracking-tight ${amountColor}`}>
            {signed}
            {formatAmount(tx.amount, tx.asset)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {tx.asset === "NGN"
              ? "Naira amount"
              : `≈ ${formatNgn(
                  convertMinor(
                    tx.amount,
                    config.decimals,
                    DEMO_NGN_RATES[tx.asset],
                    2,
                  ),
                )} at the simulated demo rate`}
          </p>

          <div className="mt-6 space-y-3">
            <Row label="Reference" value={tx.reference} mono copy />
            <Row label="Type" value={tx.type.replaceAll("_", " ")} />
            <Row label="Asset" value={`${tx.asset} — ${config.name}`} />
            <Row label="Amount" value={formatAmount(tx.amount, tx.asset)} mono />
            <Row label="Fee" value={formatAmount(tx.fee, tx.asset)} mono />
            <Row label="Direction" value={tx.direction} />
            {tx.counterparty ? <Row label="Counterparty" value={tx.counterparty} /> : null}
            {tx.planId ? <Row label="Plan ID" value={tx.planId} mono /> : null}
            <Row label="Created" value={formatDateTime(tx.createdAt)} />
            {tx.completedAt ? <Row label="Completed" value={formatDateTime(tx.completedAt)} /> : null}
            <Row
              label="Execution"
              value={tx.simulated ? "Demo engine — no real settlement" : "Live provider"}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/activity"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3.5 text-xs font-medium text-fg transition-colors hover:bg-surface-2"
            >
              <ArrowUpRight className="size-3.5" /> Back to activity
            </Link>
            <Link
              href="/assistant"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-xs font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
            >
              Ask about this
            </Link>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-fg">Status timeline</h3>
            <ol className="mt-4 space-y-4">
              <TimelineItem
                icon={CheckCircle2}
                title="Transaction created"
                detail={formatDateTime(tx.createdAt)}
                active
              />
              <TimelineItem
                icon={tx.status === "failed" ? XCircle : Clock}
                title={
                  tx.status === "failed"
                    ? "Execution failed"
                    : tx.status === "completed"
                      ? "Completed"
                      : "Processing"
                }
                detail={
                  tx.status === "completed"
                    ? "Demo operation completed"
                    : tx.status === "failed"
                      ? "No funds moved"
                      : "Awaiting demo settlement"
                }
                active={tx.status !== "pending"}
                danger={tx.status === "failed"}
              />
              <TimelineItem
                icon={tx.status === "completed" ? CheckCircle2 : Circle}
                title="Reconciled"
                detail={tx.status === "completed" ? "Demo ledger entry recorded" : "Not yet reconciled"}
                active={tx.status === "completed"}
              />
            </ol>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" />
              <h3 className="text-sm font-semibold text-fg">Security note</h3>
            </div>
            <p className="mt-2 text-[10.5px] leading-5 text-muted">
              This transaction was validated and recorded by the Nearvora backend. It is simulated
              and does not represent a bank settlement, blockchain transfer or provider event.
            </p>
          </Card>
        </div>
      </div>

      <DemoNotice>
        Do not use this reference as proof of payment. Demo references are not recognised by any
        bank, chain or provider.
      </DemoNotice>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
  copy = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copy?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/60 pb-2.5 last:border-0 last:pb-0">
      <span className="text-[11px] capitalize text-muted">{label}</span>
      <span className="flex max-w-[62%] items-center gap-2">
        <span
          className={`break-all text-right text-[11px] font-medium text-fg ${mono ? "font-mono" : "capitalize"}`}
        >
          {value}
        </span>
        {copy ? <CopyButton value={value} label="" /> : null}
      </span>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  title,
  detail,
  active,
  danger = false,
}: {
  icon: typeof Circle;
  title: string;
  detail: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${
          danger ? "text-danger" : active ? "text-success" : "text-muted-2"
        }`}
      />
      <div>
        <p className={`text-[11px] font-medium ${active || danger ? "text-fg" : "text-muted"}`}>
          {title}
        </p>
        <p className="text-[10px] text-muted-2">{detail}</p>
      </div>
    </li>
  );
}
