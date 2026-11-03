"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  Building2,
  Database,
  FlaskConical,
  KeyRound,
  Layers,
  LogOut,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import { postJson, issueMessage } from "@/lib/client/api";
import { useSession } from "@/components/providers";
import { useToast } from "@/components/ui/toast";
import type { AuditLog, Notification } from "@/lib/types/domain";
import { formatDateTime, relativeTime } from "@/lib/money/format";
import { PageHeader, Card, SectionHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Skeleton } from "@/components/ui/states";

export default function AccountPage() {
  const router = useRouter();
  const { user, system } = useSession();
  const { toast } = useToast();
  const notifications = useApi<Notification[]>("/api/notifications");
  const audit = useApi<AuditLog[]>("/api/account/audit");
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  const resetDemo = async () => {
    setResetting(true);
    try {
      await postJson<{ reset: boolean }>("/api/demo/reset");
      toast({
        title: "Demo reset",
        description: "Balances and demo data were restored to the seeded state.",
        variant: "success",
      });
      setResetOpen(false);
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      toast({ title: "Reset failed", description: issueMessage(error), variant: "error" });
    } finally {
      setResetting(false);
    }
  };

  const signOut = async () => {
    try {
      await fetch("/api/session", { method: "DELETE", credentials: "same-origin" });
      router.replace("/");
      router.refresh();
    } catch {
      toast({ title: "Could not sign out", variant: "error" });
    }
  };

  const markRead = async () => {
    try {
      await postJson("/api/notifications");
      void notifications.refetch({ quiet: true });
    } catch (error) {
      toast({ title: "Could not update notifications", description: issueMessage(error), variant: "error" });
    }
  };

  const integrations = [
    {
      icon: Bot,
      name: "AI model",
      state: system.ai.configured ? "Configured" : "Development planner",
      variant: system.ai.configured ? ("success" as const) : ("warning" as const),
      detail: system.ai.note,
      detail2: system.ai.model ? `Model: ${system.ai.model}` : "No model key in environment",
    },
    {
      icon: Layers,
      name: "NEAR Intents",
      state: system.near.intentsConfigured ? "Configured" : "Adapter scaffolded",
      variant: system.near.intentsConfigured ? ("success" as const) : ("warning" as const),
      detail: "Cross-chain quote and settlement boundary. Live routing is not implemented.",
      detail2: `Network: ${system.near.network} · live execution: no`,
    },
    {
      icon: ShieldCheck,
      name: "OutLayer",
      state: system.near.outlayerMode === "live" ? "Live" : "Demo policy",
      variant: system.near.outlayerMode === "live" ? ("success" as const) : ("warning" as const),
      detail: "Protected execution and wallet policy boundary. Demo attestations are never fabricated.",
      detail2: "Guard runs before every execution",
    },
    {
      icon: Building2,
      name: "Naira payments",
      state: system.payments.mode === "live" ? "Live" : system.payments.provider,
      variant: system.payments.mode === "live" ? ("success" as const) : ("warning" as const),
      detail: system.payments.note,
      detail2: "Monnify, Paystack and Flutterwave are integration targets",
    },
    {
      icon: ScrollText,
      name: "Accounting",
      state: system.accounting.formanceConfigured ? "Formance configured" : "Demo ledger",
      variant: system.accounting.formanceConfigured ? ("success" as const) : ("warning" as const),
      detail: system.accounting.note,
      detail2: "Double-entry journal boundary",
    },
    {
      icon: Database,
      name: "Data store",
      state: "In-memory demo",
      variant: "warning" as const,
      detail:
        "Prisma schema, SQL migration and seed are included. Runtime persistence is still demo-only in this build and resets on restart.",
      detail2: system.databaseConfigured
        ? "DATABASE_URL is configured for migrations"
        : "Provision PostgreSQL with npm run db:migrate && npm run db:seed",
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Account"
        title="Account & settings"
        description="Profile, security policies, integration status and the demo audit trail."
        action={<Badge variant="warning">Demo profile</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full border border-accent/25 bg-accent/10 text-sm font-semibold text-accent">
              {initials}
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">{user.name}</p>
              <p className="text-[10.5px] text-muted-2">{user.email}</p>
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            <Row label="Phone" value={user.phone} />
            <Row label="User ID" value={user.id} mono />
            <Row label="KYC" value={user.kycStatus} />
            <Row label="Account type" value="Demo personal wallet" />
            <Row label="Member since" value={formatDateTime(user.createdAt)} />
          </div>
          <div className="mt-5 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
              <RefreshCcw className="size-3.5" /> Reset demo data
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-3.5" /> Sign out
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" />
              <h3 className="text-sm font-semibold text-fg">Security posture</h3>
            </div>
            <Badge variant="success">Backend enforced</Badge>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              {
                icon: KeyRound,
                title: "Signed demo session",
                detail: "HTTP-only, same-site cookie signed with HMAC. Server-validated on every API call.",
              },
              {
                icon: ShieldCheck,
                title: "Explicit approval",
                detail: "Plans require a backend approval record. Hidden buttons alone never protect an operation.",
              },
              {
                icon: RefreshCcw,
                title: "Idempotent execution",
                detail: "Approval and creation accept idempotency keys so retries cannot double-spend.",
              },
              {
                icon: AlertTriangle,
                title: "High-risk checks",
                detail: "New recipients, large values and expired quotes trigger extra verification.",
              },
              {
                icon: Layers,
                title: "Rate limiting",
                detail: "In-memory token buckets protect quotes, plans, approvals and AI chat.",
              },
              {
                icon: ScrollText,
                title: "Audit logging",
                detail: "Plan creation, execution, cancellation and AI calls are recorded.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-line bg-surface-2/60 p-3">
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 text-accent" />
                    <p className="text-[11px] font-medium text-fg">{item.title}</p>
                  </div>
                  <p className="mt-1 text-[10px] leading-4 text-muted">{item.detail}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <section>
        <SectionHeading
          title="Integration status"
          description="Honest reporting. Unconfigured services are labelled rather than simulated as live."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card key={integration.name} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted" />
                    <p className="text-xs font-semibold text-fg">{integration.name}</p>
                  </div>
                  <Badge variant={integration.variant}>{integration.state}</Badge>
                </div>
                <p className="mt-2.5 text-[10.5px] leading-4 text-muted">{integration.detail}</p>
                <p className="mt-1.5 text-[9.5px] text-muted-2">{integration.detail2}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <SectionHeading
            title="Notifications"
            action={
              <button
                type="button"
                onClick={markRead}
                className="text-[10.5px] font-medium text-muted hover:text-fg"
              >
                Mark all read
              </button>
            }
          />
          <Card className="divide-y divide-line">
            {notifications.loading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (notifications.data ?? []).length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted">No notifications.</p>
            ) : (
              (notifications.data ?? []).slice(0, 8).map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={`mt-1 size-1.5 shrink-0 rounded-full ${
                      notification.read ? "bg-line-strong" : "bg-accent"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-medium text-fg">{notification.title}</p>
                    <p className="mt-0.5 text-[10px] leading-4 text-muted">{notification.body}</p>
                  </div>
                  <span className="shrink-0 text-[9.5px] text-muted-2">
                    {relativeTime(notification.createdAt)}
                  </span>
                </div>
              ))
            )}
          </Card>
        </section>

        <section>
          <SectionHeading
            title="Audit trail"
            description="Recent backend actions for this demo profile."
          />
          <Card className="max-h-[420px] divide-y divide-line overflow-y-auto">
            {audit.loading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (audit.data ?? []).length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted">No audit events yet.</p>
            ) : (
              (audit.data ?? []).map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="font-mono text-[10.5px] text-fg">{log.action}</p>
                    <p className="truncate text-[9.5px] text-muted-2">
                      {log.entity} · {log.entityId}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] text-muted-2">
                    {relativeTime(log.createdAt)}
                  </span>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>

      <DemoNotice>
        {system.demoMode
          ? "Demo mode is active. This profile is not a real customer account and holds no real funds."
          : "Demo mode is disabled. Live provider execution is still unavailable in this build."}
      </DemoNotice>

      <Modal
        open={resetOpen}
        onClose={() => (resetting ? undefined : setResetOpen(false))}
        title="Reset demo data?"
        description="This restores seeded balances, transactions, plans and conversations."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={resetDemo} loading={resetting}>
              <RefreshCcw className="size-3.5" /> Reset demo
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 rounded-lg border border-warning/25 bg-warning/5 p-3">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-[11px] leading-5 text-muted">
            Any plan or demo transaction you created will be cleared. No real money is involved. The
            server&apos;s in-memory store is restored only for this process.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-muted">{label}</span>
      <span
        className={`max-w-[62%] truncate text-right text-[11px] font-medium capitalize text-fg ${
          mono ? "font-mono normal-case" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
