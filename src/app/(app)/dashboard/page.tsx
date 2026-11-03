"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpRight,
  Bot,
  ChevronRight,
  Coins,
  Download,
  Plus,
  ReceiptText,
  Send,
  Smartphone,
  Sparkles,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import type { PortfolioSnapshot, Transaction } from "@/lib/types/domain";
import { formatNgn } from "@/lib/money/format";
import { PageHeader, SectionHeading, Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { useSession } from "@/components/providers";
import { Sparkline } from "@/components/dashboard/sparkline";
import { WalletList } from "@/components/wallets/wallet-list";
import { TransactionList } from "@/components/transactions/transaction-list";

const quickActions = [
  { href: "/deposit", label: "Deposit Naira", icon: ArrowDownToLine },
  { href: "/withdraw", label: "Withdraw Naira", icon: ArrowUpRight },
  { href: "/transfer", label: "Send money", icon: Send },
  { href: "/deposit#receive", label: "Receive money", icon: Download },
  { href: "/wallets/receive", label: "Deposit crypto", icon: Coins },
  { href: "/wallets/send", label: "Withdraw crypto", icon: Wallet },
  { href: "/swap?from=NGN&to=USDT", label: "Convert", icon: ArrowLeftRight },
  { href: "/swap", label: "Swap", icon: Zap },
];

const services = [
  {
    href: "/bills?category=airtime",
    label: "Airtime",
    description: "MTN, Glo, Airtel, 9mobile",
    icon: Smartphone,
  },
  {
    href: "/bills?category=data",
    label: "Mobile data",
    description: "Data bundles",
    icon: Wifi,
  },
  {
    href: "/bills?category=electricity",
    label: "Electricity",
    description: "Prepaid & postpaid",
    icon: Zap,
  },
  {
    href: "/bills",
    label: "More services",
    description: "Bills & utilities",
    icon: ReceiptText,
  },
];

const prompts = [
  "Send ₦50,000 to my brother and convert ₦100,000 to USDT",
  "Pay my electricity bill and leave the rest",
];

export default function DashboardPage() {
  const { user, system } = useSession();
  const portfolio = useApi<PortfolioSnapshot>("/api/wallets");
  const activity = useApi<Transaction[]>("/api/transactions?limit=5");

  if (portfolio.loading && !portfolio.data) {
    return <PageSkeleton />;
  }

  const data = portfolio.data;
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Demo workspace"
        title={`Good to see you, ${firstName}`}
        description="Your simulated Naira and crypto workspace. Review balances, prepare a plan, and approve every movement."
        action={
          <Link
            href="/assistant"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
          >
            <Sparkles className="size-4" /> Ask Nearvora
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div
            className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-accent/[0.05] blur-3xl"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                  Total estimated portfolio
                </p>
                <Badge variant="warning">Simulated</Badge>
              </div>
              <p className="mt-2.5 font-mono text-[32px] font-semibold tracking-tight text-fg sm:text-[38px]">
                {formatNgn(data?.totalNgn ?? "0")}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                <span className="font-medium text-success">+{data?.changePercent ?? 0}%</span>
                <span className="text-muted-2">simulated 30-day change</span>
              </div>
            </div>
            <Sparkline className="mt-2 hidden w-32 sm:block" />
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-surface-2/70 p-3.5">
              <p className="text-[10.5px] text-muted">Naira available</p>
              <p className="mt-1 font-mono text-sm font-medium text-fg">
                {formatNgn(data?.nairaAvailable ?? "0")}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-2">
                Pending {formatNgn(data?.nairaPending ?? "0")}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface-2/70 p-3.5">
              <p className="text-[10.5px] text-muted">Crypto value</p>
              <p className="mt-1 font-mono text-sm font-medium text-fg">
                {formatNgn(data?.cryptoValueNgn ?? "0")}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-2">
                {data?.assets.filter((asset) => asset.kind === "crypto").length ?? 0} demo assets
              </p>
            </div>
          </div>

          <div className="relative mt-4 flex gap-2">
            <Link
              href="/deposit"
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent text-xs font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
            >
              <Plus className="size-3.5" /> Add money
            </Link>
            <Link
              href="/transfer"
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line-strong text-xs font-medium text-fg transition-colors hover:bg-surface-2"
            >
              <Send className="size-3.5" /> Send
            </Link>
            <Link
              href="/swap"
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line-strong text-xs font-medium text-fg transition-colors hover:bg-surface-2"
            >
              <ArrowLeftRight className="size-3.5" /> Swap
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col border-accent/20 bg-accent/[0.02] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl border border-accent/25 bg-accent/10">
                <Bot className="size-4 text-accent" />
              </span>
              <div>
                <p className="text-xs font-semibold text-fg">Nearvora AI</p>
                <p className="text-[10px] text-muted-2">Financial assistant</p>
              </div>
            </div>
            <Badge variant={system.ai.configured ? "accent" : "neutral"}>
              {system.ai.configured ? "Model ready" : "Dev planner"}
            </Badge>
          </div>
          <p className="mt-4 text-[13px] font-medium leading-6 text-fg">
            What would you like to do with your money today?
          </p>
          <div className="mt-3 flex flex-1 flex-col gap-2">
            {prompts.map((prompt) => (
              <Link
                key={prompt}
                href={`/assistant?prompt=${encodeURIComponent(prompt)}`}
                className="group flex items-start justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-[11px] leading-4 text-muted transition-colors hover:border-accent/30 hover:text-fg"
              >
                <span>{prompt}</span>
                <ChevronRight className="mt-0.5 size-3 shrink-0 text-muted-2 group-hover:text-accent" />
              </Link>
            ))}
          </div>
          <Link
            href="/assistant"
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-accent hover:underline"
          >
            Open assistant <ArrowUpRight className="size-3.5" />
          </Link>
        </Card>
      </div>

      <section>
        <SectionHeading title="Quick actions" />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href + action.label}
                href={action.href}
                className="group flex flex-col items-center gap-2 rounded-xl border border-line bg-surface px-1.5 py-3 text-center transition-colors hover:border-line-strong hover:bg-surface-2"
              >
                <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-muted transition-colors group-hover:text-accent">
                  <Icon className="size-3.5" />
                </span>
                <span className="text-[9.5px] font-medium leading-3 text-muted group-hover:text-fg">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeading
            title="Wallets"
            action={
              <Link href="/wallets" className="text-[11px] font-medium text-muted hover:text-fg">
                View all
              </Link>
            }
          />
          <WalletList assets={data?.assets ?? null} loading={portfolio.loading} />
        </section>
        <section>
          <SectionHeading
            title="Recent activity"
            action={
              <Link href="/activity" className="text-[11px] font-medium text-muted hover:text-fg">
                View all
              </Link>
            }
          />
          <TransactionList
            transactions={activity.data}
            loading={activity.loading}
            emptyTitle="No activity yet"
          />
        </section>
      </div>

      <section>
        <SectionHeading
          title="Everyday services"
          description="Demo bill flows. No provider is contacted."
          action={
            <Link href="/bills" className="text-[11px] font-medium text-muted hover:text-fg">
              All services
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Link
                key={service.label}
                href={service.href}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3.5 transition-colors hover:bg-surface-2"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium text-fg">{service.label}</span>
                  <span className="block truncate text-[10px] text-muted-2">
                    {service.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <DemoNotice>
        Total portfolio, asset values and 30-day change are computed from simulated demo rates.
        No real funds are held or moved.
      </DemoNotice>
    </div>
  );
}
