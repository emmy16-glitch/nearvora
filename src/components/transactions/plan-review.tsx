"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Info,
  Landmark,
  Lock,
  ReceiptText,
  ShieldAlert,
  Send,
  Wallet,
} from "lucide-react";
import type { PlanOperation, TransactionPlan } from "@/lib/types/domain";
import { formatAmount, formatNgn } from "@/lib/money/format";
import { postJson, issueMessage } from "@/lib/client/api";
import { cn } from "@/lib/utils/cn";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge, DemoBadge, StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/providers";
import { useCountdown } from "@/lib/hooks/use-countdown";

const kindIcons = {
  bank_transfer: Send,
  crypto_transfer: ArrowUpRight,
  swap: ArrowLeftRight,
  bill_payment: ReceiptText,
  cash_deposit: Banknote,
  cash_withdrawal: Landmark,
} as const;

export function OperationRow({ operation }: { operation: PlanOperation }) {
  const Icon = kindIcons[operation.kind] ?? Wallet;
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-muted">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-fg">{operation.title}</p>
        <p className="mt-0.5 truncate text-[10.5px] text-muted-2">
          {operation.recipientDetail ?? operation.recipientName ?? operation.kind.replaceAll("_", " ")}
          {operation.network ? ` · ${operation.network}` : ""}
        </p>
        {operation.error ? (
          <p className="mt-1 text-[10.5px] text-danger">{operation.error}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[11.5px] font-medium text-fg">
          {formatAmount(operation.amount, operation.asset)}
        </p>
        {operation.targetAsset && operation.targetAmount ? (
          <p className="mt-0.5 font-mono text-[10px] text-accent">
            → {formatAmount(operation.targetAmount, operation.targetAsset)}
          </p>
        ) : null}
        {operation.fee !== "0" ? (
          <p className="mt-0.5 text-[9.5px] text-muted-2">
            fee {formatAmount(operation.fee, operation.asset)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function PlanSummaryCard({
  plan,
  onReview,
  compact = false,
}: {
  plan: TransactionPlan;
  onReview: () => void;
  compact?: boolean;
}) {
  const actionable = plan.status === "AWAITING_APPROVAL";
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-bg-soft">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3.5 py-2.5">
        <StatusBadge status={plan.status} />
        <span className="text-[11px] font-medium text-fg">{plan.title}</span>
        <DemoBadge />
        <Badge
          variant={
            plan.riskLevel === "high" ? "danger" : plan.riskLevel === "medium" ? "warning" : "success"
          }
          className="ml-auto"
        >
          {plan.riskLevel} risk
        </Badge>
      </div>
      <div className={cn("divide-y divide-line px-3.5", compact && "max-h-56 overflow-y-auto")}>
        {plan.operations.map((operation) => (
          <OperationRow key={operation.id} operation={operation} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line bg-surface/60 px-3.5 py-2.5">
        <div>
          <p className="text-[9.5px] uppercase tracking-wider text-muted-2">Estimated total</p>
          <p className="font-mono text-[11px] font-medium text-fg">{formatNgn(plan.totalNgn)}</p>
        </div>
        <div className="text-right">
          <p className="text-[9.5px] uppercase tracking-wider text-muted-2">Est. Naira left</p>
          <p className="font-mono text-[11px] font-medium text-accent">
            {formatNgn(plan.remainingNgn)}
          </p>
        </div>
      </div>
      {actionable ? (
        <div className="border-t border-line p-2.5">
          <Button size="sm" className="w-full" onClick={onReview}>
            Review &amp; approve plan
          </Button>
        </div>
      ) : plan.status === "COMPLETED" || plan.status === "PARTIALLY_COMPLETED" ? (
        <div className="border-t border-line p-2.5">
          <Link
            href="/activity"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-strong py-2 text-[11px] font-medium text-muted transition-colors hover:text-fg"
          >
            View activity <ArrowUpRight className="size-3" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

interface ApprovalResult {
  plan: TransactionPlan;
  transactions: { id: string; reference: string }[];
}

export function PlanReviewModal({
  plan,
  open,
  onClose,
  onExecuted,
}: {
  plan: TransactionPlan | null;
  open: boolean;
  onClose: () => void;
  onExecuted?: (plan: TransactionPlan) => void;
}) {
  const { demo } = useSession();
  const { toast } = useToast();
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<TransactionPlan | null>(null);
  const [idempotencyKey, setIdempotencyKey] = React.useState("");
  const { seconds, expired } = useCountdown(plan?.expiresAt);

  React.useEffect(() => {
    if (!open) return;
    setAcknowledged(false);
    setError(null);
    setResult(null);
    setSubmitting(false);
    setIdempotencyKey(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  }, [open, plan?.id]);

  if (!plan) return null;

  const current = result ?? plan;
  const finished = ["COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "CANCELLED", "EXPIRED"].includes(
    current.status,
  );
  const canApprove =
    current.status === "AWAITING_APPROVAL" &&
    !expired &&
    !submitting &&
    demo &&
    (!current.requiresAcknowledgment || acknowledged);

  const approve = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await postJson<ApprovalResult>(`/api/plans/${plan.id}/approve`, {
        acknowledged,
        idempotencyKey,
      });
      setResult(response.plan);
      onExecuted?.(response.plan);
      const message =
        response.plan.status === "COMPLETED"
          ? "Demo plan completed. No real money moved."
          : response.plan.status === "PARTIALLY_COMPLETED"
            ? "Plan partially completed. Review the operation statuses."
            : "The plan could not be fully completed.";
      toast({
        title: response.plan.status === "COMPLETED" ? "Demo execution complete" : "Plan update",
        description: message,
        variant: response.plan.status === "FAILED" ? "error" : "success",
      });
    } catch (caught) {
      const message = issueMessage(caught);
      setError(message);
      toast({ title: "Approval failed", description: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title={finished ? "Execution result" : "Review combined plan"}
      description={
        finished
          ? "This result is from the Nearvora demo execution engine."
          : "One approval covers every operation below. The backend validates again before executing."
      }
      size="lg"
      footer={
        finished ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10.5px] text-muted">
              {current.status === "COMPLETED"
                ? "All demo operations completed."
                : current.failureReason ?? "Review the operation statuses."}
            </p>
            <Button size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-4 text-muted-2 sm:max-w-[55%]">
              {expired
                ? "This plan expired. Close it and prepare a fresh plan."
                : "Nothing is executed until you approve. Demo mode only."}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={approve}
                loading={submitting}
                disabled={!canApprove}
              >
                <Lock className="size-3.5" />
                Approve &amp; execute demo
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={current.status} />
          <span className="text-xs font-medium text-fg">{current.title}</span>
          <DemoBadge />
          <Badge
            variant={
              current.riskLevel === "high"
                ? "danger"
                : current.riskLevel === "medium"
                  ? "warning"
                  : "success"
            }
            className="ml-auto"
          >
            {current.riskLevel} risk
          </Badge>
        </div>

        <div className="divide-y divide-line rounded-xl border border-line">
          {current.operations.map((operation) => (
            <div key={operation.id} className="flex items-center gap-2 px-1">
              <div className="min-w-0 flex-1">
                <OperationRow operation={operation} />
              </div>
              {operation.status !== "pending" ? (
                <StatusBadge status={operation.status} />
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-2">Estimated total</p>
            <p className="mt-1 font-mono text-sm font-medium text-fg">{formatNgn(current.totalNgn)}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-2">Est. Naira remaining</p>
            <p className="mt-1 font-mono text-sm font-medium text-accent">
              {formatNgn(current.remainingNgn)}
            </p>
          </div>
        </div>

        {current.warnings.length > 0 ? (
          <div className="space-y-2">
            {current.warnings.map((warning) => {
              const Icon =
                warning.severity === "danger"
                  ? ShieldAlert
                  : warning.severity === "warning"
                    ? AlertTriangle
                    : Info;
              return (
                <div
                  key={warning.code}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-3 py-2 text-[10.5px] leading-4",
                    warning.severity === "danger"
                      ? "border-danger/25 bg-danger/5 text-danger"
                      : warning.severity === "warning"
                        ? "border-warning/25 bg-warning/5 text-warning"
                        : "border-line bg-surface-2 text-muted",
                  )}
                >
                  <Icon className="mt-0.5 size-3.5 shrink-0" />
                  {warning.message}
                </div>
              );
            })}
          </div>
        ) : null}

        {!finished ? (
          <div className="rounded-xl border border-line bg-surface p-3.5">
            <div className="flex items-center justify-between text-[10.5px] text-muted">
              <span>Plan expires in</span>
              <span className="font-mono">{expired ? "Expired" : formatClock(seconds)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted">
              <span>Approval enforcement</span>
              <span className="text-fg">Backend-validated</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted">
              <span>Execution layer</span>
              <span className="text-warning">OutLayer demo policy · not verified</span>
            </div>
          </div>
        ) : null}

        {current.requiresAcknowledgment && !finished ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-3.5">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--nv-danger)]"
            />
            <span className="text-[11px] leading-5 text-fg">
              I understand this is a <strong>high-risk</strong> demo plan and I have checked every
              recipient, amount and fee. I approve the backend to execute these simulated
              operations.
            </span>
          </label>
        ) : null}

        {current.executionGuard ? (
          <div className="rounded-xl border border-line bg-surface p-3 text-[10.5px] leading-4 text-muted">
            <p className="font-medium text-fg">Execution guard</p>
            <p className="mt-1">
              {current.executionGuard.provider} · {current.executionGuard.mode} mode ·{" "}
              {current.executionGuard.verified ? "verified" : "not verified"} ·{" "}
              {current.executionGuard.simulated ? "simulated" : "live"}
            </p>
            <p className="mt-1 text-muted-2">{current.executionGuard.note}</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-[11px] text-danger">
            {error}
          </div>
        ) : null}

        {!demo ? (
          <div className="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-[11px] text-warning">
            Live execution is disabled in this build. Demo mode is required to approve plans.
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
