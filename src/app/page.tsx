import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Bot,
  Building2,
  Check,
  Layers,
  Lock,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Wallet,
    title: "Naira and crypto wallets",
    body: "Hold Naira, USDT, USDC, BTC and ETH in one portfolio view with clear available and pending balances.",
  },
  {
    icon: ArrowLeftRight,
    title: "Conversions that explain themselves",
    body: "See the rate, spread, fee, quote expiry and expected amount before you approve. Every demo quote is labelled.",
  },
  {
    icon: Sparkles,
    title: "AI that prepares, not spends",
    body: "Describe a money plan in plain language. The assistant builds a structured plan; the backend validates and waits for your approval.",
  },
  {
    icon: Building2,
    title: "Naira payment adapters",
    body: "Provider-agnostic collection, virtual accounts, withdrawals and bill payments. Monnify, Paystack and Flutterwave are integration targets.",
  },
  {
    icon: Layers,
    title: "NEAR-ready architecture",
    body: "Dedicated boundaries for NEAR Intents, cross-chain quotes and chain signatures. Live support is reported honestly, not assumed.",
  },
  {
    icon: Lock,
    title: "Protected execution",
    body: "An OutLayer adapter enforces wallet policy and attestation boundaries. The AI never controls a master key.",
  },
];

const planSteps = [
  { label: "Transfer to Emmanuel (Brother)", amount: "₦200,000.00", status: "Verified recipient" },
  { label: "Convert NGN to USDT", amount: "₦300,000.00", status: "Simulated quote" },
  { label: "Ikeja Electric · Home meter", amount: "₦18,400.00", status: "Saved bill" },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line/70">
        <div className="nv-container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-7 text-xs text-muted md:flex" aria-label="Landing">
            <a href="#product" className="transition-colors hover:text-fg">
              Product
            </a>
            <a href="#modes" className="transition-colors hover:text-fg">
              How it works
            </a>
            <a href="#architecture" className="transition-colors hover:text-fg">
              Architecture
            </a>
          </nav>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-xs font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
          >
            Open demo <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div
            className="nv-grid-bg pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,black,transparent)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[680px] -translate-x-1/2 rounded-full bg-accent/[0.055] blur-3xl"
            aria-hidden
          />
          <div className="nv-container relative grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-24">
            <div>
              <Badge variant="warning">
                <span className="size-1.5 rounded-full bg-warning" aria-hidden />
                Demo prototype · simulated funds
              </Badge>
              <h1 className="mt-5 max-w-xl text-[38px] font-semibold leading-[1.06] tracking-[-0.035em] text-fg sm:text-[54px]">
                Naira and crypto.
                <br />
                One calm command centre.
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-7 text-muted">
                Nearvora brings everyday Naira finance, crypto wallets and cross-chain
                conversions together — with an AI assistant that prepares plans, not
                surprises. You approve every movement.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
                >
                  Explore the demo <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#modes"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong px-5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
                >
                  See how it works
                </a>
              </div>
              <ul className="mt-8 grid gap-2.5 text-[12.5px] text-muted sm:grid-cols-2">
                {[
                  "Manual and AI share one transaction engine",
                  "Approvals enforced by the backend",
                  "Demo data is never presented as settled money",
                  "Built for mobile and desktop",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[32px] bg-accent/[0.03] blur-xl" aria-hidden />
              <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-danger/70" />
                    <span className="size-2 rounded-full bg-warning/70" />
                    <span className="size-2 rounded-full bg-success/70" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-2">
                    Illustration · simulated
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-[11px] text-muted">Total portfolio</p>
                  <div className="mt-1 flex items-end gap-3">
                    <p className="font-mono text-[30px] font-semibold tracking-tight text-fg">
                      ₦4,213,908.40
                    </p>
                    <span className="mb-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                      +1.84%
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      { symbol: "NGN", value: "₦1,250,000" },
                      { symbol: "USDT", value: "1,845.50" },
                      { symbol: "BTC", value: "0.0264" },
                    ].map((asset) => (
                      <div key={asset.symbol} className="rounded-xl border border-line bg-surface-2 p-2.5">
                        <p className="text-[10px] text-muted">{asset.symbol}</p>
                        <p className="mt-1 truncate font-mono text-[11px] font-medium text-fg">
                          {asset.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-xl border border-line bg-bg-soft p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-lg bg-accent/10">
                        <Sparkles className="size-3.5 text-accent" />
                      </span>
                      <p className="text-[11px] font-semibold text-fg">AI money plan</p>
                      <Badge variant="warning" className="ml-auto">
                        Awaiting approval
                      </Badge>
                    </div>
                    <ul className="mt-3 space-y-2.5">
                      {planSteps.map((step) => (
                        <li key={step.label} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] text-fg">{step.label}</p>
                            <p className="text-[9.5px] text-muted-2">{step.status}</p>
                          </div>
                          <span className="shrink-0 font-mono text-[10.5px] text-muted">
                            {step.amount}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                      <span className="text-[10px] text-muted">Estimated remaining</span>
                      <span className="font-mono text-[11px] font-medium text-accent">
                        ₦731,600.00
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[9.5px] text-muted-2">
                    No execution occurs without an explicit backend-validated approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="border-b border-line py-16 lg:py-20">
          <div className="nv-container">
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                The product
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Serious financial tooling, without the noise.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                A focused workspace for the money you move every day, designed around
                clarity, explicit consent and honest integration boundaries.
              </p>
            </div>
            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="bg-surface p-6">
                    <div className="grid size-9 place-items-center rounded-xl border border-line bg-surface-2">
                      <Icon className="size-4 text-accent" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-fg">{feature.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-muted">{feature.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="modes" className="border-b border-line py-16 lg:py-20">
          <div className="nv-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                Two ways to work
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Manual control and AI assistance. One engine.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Both paths call the same wallet services, quotes, transaction plans,
                approval checks and accounting boundary. There is no separate AI wallet.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface p-6">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-teal" />
                  <h3 className="text-sm font-semibold">Manual mode</h3>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Pick assets, enter amounts, review quotes and approve. Every screen is
                  built for quick, deliberate action on a phone.
                </p>
                <ul className="mt-5 space-y-2.5 text-xs text-muted">
                  {["Send & receive", "Deposit & withdraw", "Swap with quote review", "Bills"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="size-1 rounded-full bg-teal" />
                        {item}
                      </li>
                    ),
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border border-accent/25 bg-accent/[0.035] p-6">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-accent" />
                  <h3 className="text-sm font-semibold">AI mode</h3>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Describe what you want. The assistant checks backend balances, resolves
                  saved recipients, requests quotes and presents one consolidated plan.
                </p>
                <ul className="mt-5 space-y-2.5 text-xs text-muted">
                  {[
                    "Structured transaction plans",
                    "Per-plan approval",
                    "High-risk acknowledgment",
                    "No unrestricted wallet access",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="architecture" className="border-b border-line py-16 lg:py-20">
          <div className="nv-container">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                  Honest integrations
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Built for the real stack it will become.
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Service boundaries exist for NEAR Intents, OutLayer policy execution,
                  Naira providers and Formance double-entry accounting. This prototype does
                  not pretend unverified integrations are live.
                </p>
              </div>
              <Badge variant="warning">This build: demo adapters</Badge>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Layers,
                  title: "NEAR Intents",
                  body: "Cross-chain quote and settlement boundary prepared. Live quoting requires a verified official API configuration.",
                  state: "Adapter scaffolded",
                },
                {
                  icon: ShieldCheck,
                  title: "OutLayer",
                  body: "Policy evaluation runs before demo execution. Live attestations are never fabricated when credentials are absent.",
                  state: "Demo policy engine",
                },
                {
                  icon: ReceiptText,
                  title: "Formance Ledger",
                  body: "Double-entry journal boundary and demo ledger exist. Provider reconciliation remains a production requirement.",
                  state: "Demo ledger",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-line bg-surface p-5">
                    <div className="flex items-center justify-between">
                      <Icon className="size-4 text-muted" />
                      <span className="text-[9.5px] uppercase tracking-[0.12em] text-warning">
                        {item.state}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-muted">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="nv-container">
            <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-10 sm:px-10">
              <div
                className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-accent/[0.06] blur-3xl"
                aria-hidden
              />
              <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    Open the Nearvora demo workspace.
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                    Explore balances, prepare a combined AI plan, review a simulated quote
                    and approve execution. Everything is labelled demo.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
                >
                  Enter demo <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="nv-container flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-[11px] text-muted-2">AI-powered Naira & crypto finance</span>
          </div>
          <p className="text-[11px] leading-5 text-muted-2">
            Demo prototype. Simulated balances, providers and transactions. Not a licensed
            financial service.
          </p>
        </div>
      </footer>
    </div>
  );
}
