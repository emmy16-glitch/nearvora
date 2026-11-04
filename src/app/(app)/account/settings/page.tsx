"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Database, Globe2, Palette, RefreshCcw, Settings } from "lucide-react";
import { postJson, issueMessage } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AccountScreen } from "@/components/account/account-shell";

export default function SettingsPage() {
  const { toast } = useToast();
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [language, setLanguage] = React.useState("English (Nigeria)");
  const [currency, setCurrency] = React.useState("NGN (₦)");

  async function resetDemo() {
    setResetting(true);
    try {
      await postJson("/api/demo/reset");
      toast({ title: "Demo reset", description: "Seeded demo data restored.", variant: "success" });
      setResetOpen(false);
      setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      toast({ title: "Reset failed", description: issueMessage(error), variant: "error" });
    } finally {
      setResetting(false);
    }
  }

  return (
    <AccountScreen
      title="Settings"
      action={<Settings className="size-5 text-muted-2" />}
      demoText="Nearvora is dark-mode only by design. No light theme is available."
    >
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Palette className="size-4 text-lavender" />
          <span className="flex-1 text-[12px] font-medium text-fg">Appearance</span>
          <span className="text-[10.5px] text-muted">Dark (locked)</span>
        </div>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Globe2 className="size-4 text-lavender" />
          <label htmlFor="language" className="flex-1 text-[12px] font-medium text-fg">
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-[10.5px] text-fg outline-none focus:border-accent/60"
          >
            <option>English (Nigeria)</option>
            <option>English (UK)</option>
          </select>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Database className="size-4 text-lavender" />
          <label htmlFor="currency" className="flex-1 text-[12px] font-medium text-fg">
            Display currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-[10.5px] text-fg outline-none focus:border-accent/60"
          >
            <option>NGN (₦)</option>
            <option>USD ($)</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        {[
          { href: "/account/profile", label: "Profile information" },
          { href: "/account/security", label: "Security settings" },
          { href: "/account/notifications", label: "Notification preferences" },
          { href: "/account/limits", label: "Spending limits" },
          { href: "/rates", label: "Exchange rates" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0 transition-colors hover:bg-surface-2/60"
          >
            <span className="flex-1 text-[12px] font-medium text-fg">{item.label}</span>
            <ChevronRight className="size-4 text-muted-2" />
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-fg">Demo data</h2>
        <p className="mt-1 text-[10.5px] leading-4 text-muted">
          Restore seeded balances, transactions and conversations. No real data is affected.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setResetOpen(true)}>
          <RefreshCcw className="size-3.5" /> Reset demo data
        </Button>
      </section>

      <Modal
        open={resetOpen}
        onClose={() => (resetting ? undefined : setResetOpen(false))}
        title="Reset demo data?"
        description="Restores the seeded demo workspace."
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
          Plans, conversations and demo transactions you created will be cleared.
        </p>
      </Modal>
    </AccountScreen>
  );
}
