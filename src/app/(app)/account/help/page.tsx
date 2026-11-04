"use client";

import * as React from "react";
import { ChevronDown, CircleHelp, Mail, MessageSquare, ShieldQuestion } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { AccountScreen } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    question: "Is my money real in this build?",
    answer:
      "No. Nearvora currently runs in demo mode. Balances, transactions, quotes and addresses are simulated and no real funds move.",
  },
  {
    question: "How do I convert Naira to crypto?",
    answer:
      "Open Swap, choose the Convert tab, select NGN as the From asset and your crypto asset as the To asset. Review the simulated quote before approving.",
  },
  {
    question: "Does the AI assistant spend money on its own?",
    answer:
      "No. The assistant can prepare a structured plan, but the backend validates every operation and waits for your explicit approval.",
  },
  {
    question: "Are the wallet addresses usable?",
    answer:
      "No. Every demo address begins with demo_ and cannot receive real assets on any blockchain.",
  },
  {
    question: "When will live payments be available?",
    answer:
      "Live Naira and crypto settlement require verified provider credentials, compliance review and production infrastructure. They are not enabled in this build.",
  },
];

export default function HelpPage() {
  const { toast } = useToast();
  const [open, setOpen] = React.useState<string | null>(faqs[0].question);

  return (
    <AccountScreen title="Help & Support" action={<CircleHelp className="size-5 text-muted-2" />} demo={false}>
      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-accent/12 text-lavender">
            <MessageSquare className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-fg">Need a hand?</p>
            <p className="mt-0.5 text-[10.5px] leading-4 text-muted">
              This demo does not provide live customer support. Use the FAQ below or review the
              documentation in the repository.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast({
                title: "Demo build",
                description: "Support chat is not connected in this environment.",
                variant: "info",
              })
            }
          >
            <MessageSquare className="size-3.5" /> Start a chat
          </Button>
          <a
            href="mailto:support@nearvora.demo"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-xs font-medium text-fg transition-colors hover:bg-surface-2"
          >
            <Mail className="size-3.5" /> Email support
          </a>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <ShieldQuestion className="size-4 text-lavender" />
          <h2 className="text-[12.5px] font-semibold text-fg">Frequently asked questions</h2>
        </div>
        {faqs.map((faq) => {
          const expanded = open === faq.question;
          return (
            <div key={faq.question} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : faq.question)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="flex-1 text-[11.5px] font-medium text-fg">{faq.question}</span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-2 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>
              {expanded ? (
                <p className="px-4 pb-4 text-[10.5px] leading-5 text-muted">{faq.answer}</p>
              ) : null}
            </div>
          );
        })}
      </section>
    </AccountScreen>
  );
}
