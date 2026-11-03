"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Bot,
  ChevronRight,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/ui/logo";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { useSession } from "@/components/providers";

const nav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
  { href: "/account", label: "Account", icon: UserRound },
];

const sectionTitles: { prefix: string; label: string }[] = [
  { prefix: "/dashboard", label: "Home" },
  { prefix: "/wallets", label: "Wallets" },
  { prefix: "/swap", label: "Swap" },
  { prefix: "/assistant", label: "AI Assistant" },
  { prefix: "/account", label: "Account" },
  { prefix: "/activity", label: "Activity" },
  { prefix: "/deposit", label: "Deposit" },
  { prefix: "/withdraw", label: "Withdraw" },
  { prefix: "/transfer", label: "Send money" },
  { prefix: "/bills", label: "Bills & services" },
  { prefix: "/transactions", label: "Transaction" },
];

function activeFor(pathname: string) {
  return sectionTitles
    .filter((section) => pathname.startsWith(section.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]?.label;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, system, demo } = useSession();
  const title = activeFor(pathname) ?? "Nearvora";
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-bg-soft lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard" aria-label="Nearvora home">
            <Logo />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-3" aria-label="Primary">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-surface-3 text-fg"
                    : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <Icon
                  className={cn("size-4", active ? "text-accent" : "text-muted-2 group-hover:text-muted")}
                />
                {item.label}
                {item.href === "/assistant" && !system.ai.configured ? (
                  <span className="ml-auto rounded-full border border-line-strong px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-2">
                    Dev
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-3">
          <div className="rounded-xl border border-line bg-surface p-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-accent" />
              <p className="text-[11px] font-semibold text-fg">Demo mode</p>
            </div>
            <p className="mt-1.5 text-[10.5px] leading-4 text-muted">
              Balances, quotes and settlements are simulated. Nothing here is real money.
            </p>
            <Link
              href="/account"
              className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-medium text-accent hover:underline"
            >
              Integration status <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>

        <Link
          href="/account"
          className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-line bg-surface/60 p-2.5 transition-colors hover:bg-surface-2"
        >
          <span className="grid size-8 place-items-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-fg">{user.name}</span>
            <span className="block truncate text-[10px] text-muted">
              {user.kycStatus === "verified" ? "Verified" : "Demo profile"}
            </span>
          </span>
          <ChevronRight className="size-3.5 text-muted-2" />
        </Link>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur-lg lg:h-14 lg:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <Link href="/dashboard" aria-label="Nearvora home">
              <Logo />
            </Link>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted lg:flex">
            <span className="text-muted-2">Workspace</span>
            <span className="text-line-strong">/</span>
            <span className="font-medium text-fg">{title}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-2 sm:flex">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  system.ai.configured ? "bg-success" : "bg-warning",
                )}
                aria-hidden
              />
              <span className="text-[11px] text-muted">
                {system.ai.configured ? "AI model connected" : "Dev planner"}
              </span>
            </div>
            {demo ? <DemoBadge /> : <Badge variant="success">Live</Badge>}
            <Link
              href="/account"
              className="grid size-8 place-items-center rounded-full border border-line-strong bg-surface-2 text-[10px] font-semibold text-fg transition-colors hover:border-accent/40"
              aria-label="Open account"
            >
              {initials}
            </Link>
          </div>
        </header>

        <main className="nv-container pb-28 pt-5 lg:pb-12 lg:pt-7">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-soft/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
        aria-label="Primary"
      >
        <div className="grid h-16 grid-cols-5">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center justify-center gap-1"
              >
                <span
                  className={cn(
                    "grid h-8 w-11 place-items-center rounded-xl transition-colors",
                    active ? "bg-accent/12 text-accent" : "text-muted-2",
                  )}
                >
                  <Icon className="size-[18px]" />
                </span>
                <span
                  className={cn(
                    "text-[9.5px] font-medium tracking-wide",
                    active ? "text-fg" : "text-muted-2",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Link
        href="/assistant"
        className="fixed bottom-20 right-4 z-30 hidden size-12 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/40 transition-transform hover:scale-105 sm:grid lg:hidden"
        aria-label="Open AI assistant"
      >
        <Bot className="size-5" />
      </Link>
    </div>
  );
}
