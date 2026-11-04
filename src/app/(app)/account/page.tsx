"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Gauge,
  History,
  LogOut,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  BadgeCheck,
  Database,
  Bot,
  Layers,
} from "lucide-react";
import { useSession } from "@/components/providers";
import { useApi } from "@/lib/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { postJson, issueMessage } from "@/lib/client/api";
import type { Notification } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/ui/demo-notice";
import { NotificationBell } from "@/components/layout/app-shell";

const rows = [
  { href: "/account/profile", label: "Profile Information", icon: UserRound },
  { href: "/account/kyc", label: "KYC Verification", icon: BadgeCheck, verified: true },
  { href: "/account/limits", label: "Spending Limits", icon: Gauge },
  { href: "/account/security", label: "Security Settings", icon: ShieldCheck },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/activity", label: "Transaction History", icon: History },
  { href: "/account/help", label: "Help & Support", icon: CircleHelp },
];

export default function AccountPage() {
  const router = useRouter();
  const { user, system } = useSession();
  const { toast } = useToast();
  const notifications = useApi<Notification[]>("/api/notifications");
  const [signOutOpen, setSignOutOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const unread = (notifications.data ?? []).filter((item) => !item.read).length;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/session", { method: "DELETE", credentials: "same-origin" });
      router.replace("/");
      router.refresh();
    } catch {
      toast({ title: "Could not sign out", variant: "error" });
      setSigningOut(false);
    }
  };

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
      setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      toast({ title: "Reset failed", description: issueMessage(error), variant: "error" });
    } finally {
      setResetting(false);
    }
  };

  const integrations = [
    {
      icon: Bot,
      name: "AI assistant",
      state: system.ai.configured ? "Nearvora AI connected" : "Dev planner",
      ok: system.ai.configured,
    },
    {
      icon: Layers,
      name: "NEAR Intents",
      state: system.near.intentsConfigured ? "Configured" : "Adapter ready",
      ok: system.near.intentsConfigured,
    },
    {
      icon: ShieldCheck,
      name: "OutLayer",
      state: system.near.outlayerMode === "live" ? "Live" : "Demo policy",
      ok: system.near.outlayerMode === "live",
    },
    {
      icon: Database,
      name: "Data store",
      state: "In-memory demo",
      ok: false,
    },
  ];

  return (
    <div className="space-y-5 pb-2">
      <header className="flex items-center justify-between gap-3">
        <div className="size-10" aria-hidden />
        <h1 className="text-center text-[17px] font-semibold tracking-tight text-fg sm:text-lg">
          Account
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/account/settings"
            aria-label="Open settings"
            className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:text-fg"
          >
            <Settings className="size-[18px]" />
          </Link>
          <NotificationBell className="lg:hidden" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-4">
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3.5">
            <span className="nv-brand-gradient grid size-[62px] shrink-0 place-items-center rounded-full text-xl font-semibold text-white">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-semibold tracking-tight text-fg">
                {user.name}
              </h2>
              <p className="truncate text-[11.5px] text-muted">{user.email}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
                <BadgeCheck className="size-3.5" />
                {user.kycStatus === "verified" ? "Verified" : "Verification pending"}
              </p>
            </div>
            <Link
              href="/account/profile"
              aria-label="Open profile"
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted-2 transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </section>

        <nav className="overflow-hidden rounded-2xl border border-line bg-surface" aria-label="Account">
          {rows.map((row) => {
            const Icon = row.icon;
            const isNotifications = row.href === "/account/notifications";
            return (
              <Link
                key={row.href}
                href={row.href}
                className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0 transition-colors hover:bg-surface-2/60"
              >
                <span className="grid size-8 shrink-0 place-items-center text-muted-2">
                  <Icon className="size-[18px]" />
                </span>
                <span className="flex-1 text-[13px] font-medium text-fg">{row.label}</span>
                {row.verified ? <Badge variant="success">Verified</Badge> : null}
                {isNotifications && unread > 0 ? (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    {unread}
                  </span>
                ) : null}
                <ChevronRight className="size-4 shrink-0 text-muted-2" />
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSignOutOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-danger/5"
          >
            <span className="grid size-8 shrink-0 place-items-center text-danger">
              <LogOut className="size-[18px]" />
            </span>
            <span className="flex-1 text-[13px] font-medium text-danger">Log Out</span>
            <ChevronRight className="size-4 shrink-0 text-danger/60" />
          </button>
        </nav>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-lavender" />
              <h2 className="text-[13px] font-semibold text-fg">Workspace</h2>
            </div>
            <Badge variant="warning">Demo</Badge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <div
                  key={integration.name}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5"
                >
                  <Icon className="size-3.5 shrink-0 text-muted-2" />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-fg">
                    {integration.name}
                  </span>
                  <span
                    className={`shrink-0 text-[9.5px] font-medium ${
                      integration.ok ? "text-success" : "text-warning"
                    }`}
                  >
                    {integration.state}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/rates"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[10.5px] font-medium text-muted transition-colors hover:text-fg"
            >
              Exchange rates
            </Link>
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[10.5px] font-medium text-muted transition-colors hover:text-fg"
            >
              Reset demo data
            </button>
          </div>
        </section>

        <DemoNotice>
          Demo profile. No real identity documents, funds or bank accounts are attached to this
          account.
        </DemoNotice>
      </div>

      <Modal
        open={signOutOpen}
        onClose={() => (signingOut ? undefined : setSignOutOpen(false))}
        title="Log out?"
        description="You will return to the Nearvora landing page."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSignOutOpen(false)} disabled={signingOut}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={signOut} loading={signingOut}>
              <LogOut className="size-3.5" /> Log out
            </Button>
          </div>
        }
      >
        <p className="text-[11.5px] leading-5 text-muted">
          This clears the signed demo session cookie. Demo data remains stored for the next session.
        </p>
      </Modal>

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
              Reset demo
            </Button>
          </div>
        }
      >
        <p className="text-[11.5px] leading-5 text-muted">
          Any plan or demo transaction you created will be cleared. No real money is involved.
        </p>
      </Modal>
    </div>
  );
}
