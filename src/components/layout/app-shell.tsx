"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  ChevronRight,
  Home,
  Wallet,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo, LogoMark } from "@/components/ui/logo";
import { DemoBadge } from "@/components/ui/badge";
import { useSession } from "@/components/providers";
import { useApi } from "@/lib/hooks/use-api";
import type { Notification } from "@/lib/types/domain";

const nav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/account", label: "Account", icon: UserRound },
];

const secondary = [
  { href: "/rates", label: "Exchange rates", icon: BarChart3 },
  { href: "/activity", label: "Activity", icon: ReceiptText },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

const titles: { prefix: string; label: string }[] = [
  { prefix: "/dashboard", label: "Home" },
  { prefix: "/wallets", label: "Wallets" },
  { prefix: "/swap", label: "Swap & Convert" },
  { prefix: "/assistant", label: "AI Assistant" },
  { prefix: "/account", label: "Account" },
  { prefix: "/settings", label: "Settings" },
  { prefix: "/security", label: "Security" },
  { prefix: "/profile", label: "Profile" },
  { prefix: "/kyc", label: "Verification" },
  { prefix: "/limits", label: "Spending limits" },
  { prefix: "/rates", label: "Exchange rates" },
  { prefix: "/activity", label: "Activity" },
  { prefix: "/deposit", label: "Deposit" },
  { prefix: "/withdraw", label: "Withdraw" },
  { prefix: "/transfer", label: "Send money" },
  { prefix: "/bills", label: "Bills & services" },
  { prefix: "/transactions", label: "Transaction" },
];

function titleFor(pathname: string) {
  return titles
    .filter((section) => pathname.startsWith(section.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]?.label;
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/wallets") {
    return (
      pathname.startsWith("/wallets") ||
      pathname.startsWith("/deposit") ||
      pathname.startsWith("/withdraw") ||
      pathname.startsWith("/transfer") ||
      pathname.startsWith("/send") ||
      pathname.startsWith("/receive")
    );
  }
  if (href === "/swap") return pathname.startsWith("/swap");
  if (href === "/assistant") return pathname.startsWith("/assistant") || pathname.startsWith("/ai");
  if (href === "/account") return pathname.startsWith("/account") || pathname.startsWith("/profile") || pathname.startsWith("/security") || pathname.startsWith("/kyc") || pathname.startsWith("/limits") || pathname.startsWith("/settings");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function NotificationBell({ className }: { className?: string }) {
  const notifications = useApi<Notification[]>("/api/notifications");
  const unread = (notifications.data ?? []).filter((item) => !item.read).length;
  return (
    <Link
      href="/account/notifications"
      aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      className={cn(
        "relative grid size-10 place-items-center rounded-full border border-line bg-surface/70 text-muted transition-colors hover:text-fg",
        className,
      )}
    >
      <Bell className="size-[18px]" />
      {unread > 0 ? (
        <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-accent" />
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, demo } = useSession();
  const title = titleFor(pathname) ?? "Nearvora";
  const initials = initialsFor(user.name);

  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-line bg-bg-soft lg:flex">
        <div className="flex h-[74px] items-center px-6">
          <Link href="/dashboard" aria-label="Nearvora home">
            <Logo />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Primary">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-accent/14 text-fg"
                    : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                {active ? (
                  <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" aria-hidden />
                ) : null}
                <Icon
                  className={cn(
                    "size-[18px]",
                    active ? "text-lavender" : "text-muted-2 group-hover:text-muted",
                  )}
                />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-6">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-2">
              More
            </p>
            {secondary.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-[12.5px] transition-colors",
                    active
                      ? "bg-surface-3 text-fg"
                      : "text-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-lavender" : "text-muted-2")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="px-3 pb-3">
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-lavender" />
              <p className="text-[11px] font-semibold text-fg">Demo workspace</p>
            </div>
            <p className="mt-1.5 text-[10.5px] leading-4 text-muted">
              Balances, quotes and settlements are simulated. Nothing here is real money.
            </p>
            <Link
              href="/account"
              className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-medium text-lavender hover:underline"
            >
              Integration status <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>

        <Link
          href="/account"
          className="mx-3 mb-4 flex items-center gap-3 rounded-xl border border-line bg-surface/60 p-2.5 transition-colors hover:bg-surface-2"
        >
          <span className="grid size-9 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-fg">{user.name}</span>
            <span className="block truncate text-[10px] text-muted">
              {user.kycStatus === "verified" ? "Verified account" : "Demo profile"}
            </span>
          </span>
          <ChevronRight className="size-3.5 text-muted-2" />
        </Link>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 hidden h-[62px] items-center justify-between border-b border-line bg-bg/85 px-6 backdrop-blur-xl lg:flex">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="text-muted-2">Nearvora</span>
            <span className="text-line-strong">/</span>
            <span className="font-medium text-fg">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell className="size-9 border-line bg-surface" />
            {demo ? <DemoBadge /> : null}
            <Link
              href="/account"
              className="grid size-8 place-items-center rounded-full border border-line-strong bg-accent/15 text-[10px] font-semibold text-lavender transition-colors hover:border-accent/40"
              aria-label="Open account"
            >
              {initials}
            </Link>
          </div>
        </header>

        <main className="nv-container pb-28 pt-3 sm:pt-5 lg:pb-14 lg:pt-8">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-soft/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid h-[66px] max-w-xl grid-cols-5">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="group flex flex-col items-center justify-center gap-1"
              >
                <span
                  className={cn(
                    "grid h-8 w-12 place-items-center rounded-xl transition-colors",
                    active ? "text-lavender" : "text-muted-2",
                  )}
                >
                  <Icon className="size-[19px]" strokeWidth={active ? 2.3 : 1.9} />
                </span>
                <span
                  className={cn(
                    "text-[9.5px] font-medium tracking-wide sm:text-[10px]",
                    active ? "text-lavender" : "text-muted-2",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageBrandHeader({
  action,
  className,
}: {
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-center justify-between gap-3", className)}>
      <Link href="/dashboard" aria-label="Nearvora home">
        <Logo />
      </Link>
      <div className="flex items-center gap-2">
        {action}
        <NotificationBell />
      </div>
    </header>
  );
}

export function ScreenHeader({
  title,
  icon,
  backHref,
  action,
  centered = true,
}: {
  title: string;
  icon?: React.ReactNode;
  backHref?: string;
  action?: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Go back"
            className="grid size-10 shrink-0 place-items-center rounded-full text-fg transition-colors hover:bg-surface-2"
          >
            <ChevronRight className="size-5 rotate-180" />
          </Link>
        ) : icon ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-lavender">
            {icon}
          </span>
        ) : null}
      </div>
      <h1
        className={cn(
          "truncate text-[17px] font-semibold tracking-tight text-fg sm:text-lg",
          centered && "text-center",
        )}
      >
        {title}
      </h1>
      <div className="flex shrink-0 items-center justify-end gap-2">{action}</div>
    </header>
  );
}

export { LogoMark };
