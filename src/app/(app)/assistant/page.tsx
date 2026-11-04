"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Lock,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  XCircle,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import { apiFetch, postJson, issueMessage } from "@/lib/client/api";
import { useSession } from "@/components/providers";
import { useToast } from "@/components/ui/toast";
import type { ChatMessage, Conversation, TransactionPlan } from "@/lib/types/domain";
import { relativeTime } from "@/lib/money/format";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSkeleton, Spinner } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Modal } from "@/components/ui/modal";
import { PlanReviewModal, PlanSummaryCard } from "@/components/transactions/plan-review";
import { LogoMark } from "@/components/ui/logo";

interface ConversationSummary extends Conversation {
  messageCount: number;
}

interface ConversationDetail {
  conversation: Conversation;
  messages: ChatMessage[];
  plans: TransactionPlan[];
}

interface ChatResult {
  conversationId: string;
  message: ChatMessage;
  plan?: TransactionPlan;
  planner: "model" | "fallback";
  modelConnected: boolean;
  missingInformation: string[];
}

const suggestions = [
  "Convert ₦100,000 to USDT",
  "Send ₦50,000 to John Doe",
  "How much is in my crypto wallet?",
];

function AssistantClient() {
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt") ?? "";
  const { system } = useSession();
  const { toast } = useToast();

  const conversations = useApi<ConversationSummary[]>("/api/ai/conversations");
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [plans, setPlans] = React.useState<Record<string, TransactionPlan>>({});
  const [input, setInput] = React.useState(prompt);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reviewPlan, setReviewPlan] = React.useState<TransactionPlan | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const initialised = React.useRef(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const loadConversation = React.useCallback(async (id: string) => {
    try {
      const detail = await apiFetch<ConversationDetail>(`/api/ai/conversations/${id}`);
      setConversationId(id);
      setMessages(detail.messages);
      setPlans(Object.fromEntries(detail.plans.map((plan) => [plan.id, plan])));
      setError(null);
      setHistoryOpen(false);
    } catch (caught) {
      setError(issueMessage(caught));
    }
  }, []);

  React.useEffect(() => {
    if (hydrated || conversations.loading || !conversations.data) return;
    const latest = conversations.data[0];
    setHydrated(true);
    if (latest) void loadConversation(latest.id);
  }, [conversations.loading, conversations.data, hydrated, loadConversation]);

  React.useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    if (prompt) setInput(prompt);
  }, [prompt]);

  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      conversationId: conversationId ?? "pending",
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const result = await postJson<ChatResult>("/api/ai/chat", {
        conversationId: conversationId ?? undefined,
        message,
      });
      setConversationId(result.conversationId);
      setMessages((current) => [
        ...current.filter((item) => item.id !== optimistic.id),
        optimistic,
        result.message,
      ]);
      if (result.plan) {
        setPlans((current) => ({ ...current, [result.plan!.id]: result.plan! }));
      }
      if (result.missingInformation.length > 0) {
        toast({
          title: "More detail needed",
          description: "The assistant asked a follow-up question. Nothing was executed.",
          variant: "info",
        });
      }
      void conversations.refetch({ quiet: true });
    } catch (caught) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setInput(message);
      const failure = issueMessage(caught);
      setError(failure);
      toast({ title: "Assistant unavailable", description: failure, variant: "error" });
    } finally {
      setSending(false);
    }
  };

  const newChat = () => {
    setConversationId(null);
    setMessages([]);
    setPlans({});
    setInput("");
    setError(null);
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const openPlan = async (planId: string) => {
    const existing = plans[planId];
    if (existing) {
      setReviewPlan(existing);
      setReviewOpen(true);
      return;
    }
    try {
      const plan = await apiFetch<TransactionPlan>(`/api/plans/${planId}`);
      setPlans((current) => ({ ...current, [plan.id]: plan }));
      setReviewPlan(plan);
      setReviewOpen(true);
    } catch (caught) {
      toast({ title: "Plan unavailable", description: issueMessage(caught), variant: "error" });
    }
  };

  const history = conversations.data ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-2">
      <header className="flex items-center justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-full border border-accent/30 bg-accent/12 text-lavender">
          <Sparkles className="size-[18px]" />
        </span>
        <h1 className="text-center text-[17px] font-semibold tracking-tight text-fg sm:text-lg">
          AI Assistant
        </h1>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-label="Conversation history"
          className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:text-fg"
        >
          <Clock3 className="size-[18px]" />
        </button>
      </header>

      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-success" aria-hidden />
          <span className="text-[10.5px] text-muted">
            {system.ai.configured ? "Model connected" : "Deterministic development planner"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge label="Simulated" />
          <button
            type="button"
            onClick={newChat}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-[10px] font-medium text-muted transition-colors hover:text-fg"
          >
            <Plus className="size-3" /> New
          </button>
        </div>
      </div>

      <section className="flex min-h-[58dvh] flex-col overflow-hidden rounded-2xl border border-line bg-surface/60 lg:min-h-[calc(100dvh-250px)]">
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4">
          {messages.length === 0 && !sending ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
              <span className="grid size-14 place-items-center rounded-2xl border border-accent/25 bg-accent/10">
                <Sparkles className="size-6 text-lavender" />
              </span>
              <h2 className="mt-4 text-[16px] font-semibold text-fg">
                What would you like to do?
              </h2>
              <p className="mt-1.5 max-w-sm text-[11.5px] leading-5 text-muted">
                Ask in plain language. I can prepare transfers, conversions and bill payments in
                one plan. I never execute without your approval.
              </p>
              <div className="mt-5 grid w-full max-w-md gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 text-left text-[11.5px] text-muted transition-colors hover:border-accent/30 hover:text-fg"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                plan={message.planId ? plans[message.planId] : undefined}
                onReview={openPlan}
                onModify={() => {
                  setInput("Modify this plan: ");
                  inputRef.current?.focus();
                }}
              />
            ))
          )}

          {sending ? (
            <div className="flex items-start gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-accent/25 bg-accent/10">
                <LogoMark className="size-4" />
              </span>
              <div className="rounded-2xl rounded-tl-md border border-line bg-surface-2 px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-[11px] text-muted">
                  <Spinner />
                  Checking balances, recipients and quotes…
                </div>
                <p className="mt-1 text-[9px] text-muted-2">
                  Financial tools run on the backend. Nothing is executed during planning.
                </p>
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        {error ? (
          <div className="border-t border-danger/20 bg-danger/5 px-4 py-2 text-[10.5px] text-danger">
            {error}
          </div>
        ) : null}

        <div className="border-t border-line bg-surface/50 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Ask me anything..."
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[12px] leading-5 text-fg outline-none placeholder:text-muted-2 focus:border-accent/50"
              disabled={sending}
              aria-label="Message the Nearvora assistant"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
            >
              {sending ? <Spinner className="text-white" /> : <Send className="size-[18px]" />}
            </button>
          </div>
          <p className="mt-1.5 px-2 text-[9px] leading-3.5 text-muted-2">
            The assistant prepares plans only. The backend validates balances, recipients, quotes
            and approvals. Demo execution moves no real money.
          </p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-lavender" />
            <h2 className="text-[12px] font-semibold text-fg">Guardrails</h2>
          </div>
          <ul className="mt-2.5 space-y-2">
            {[
              "Backend balances only — the model cannot invent them",
              "No wallet keys or direct signing from the AI",
              "Every plan needs explicit backend approval",
              "Idempotency prevents duplicate execution",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[10px] leading-4 text-muted">
                <Lock className="mt-0.5 size-3 shrink-0 text-lavender" />
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-lavender" />
            <h2 className="text-[12px] font-semibold text-fg">Manual handoff</h2>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-muted">
            Every AI operation has a manual equivalent using the same backend engine.
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {[
              { href: "/transfer", label: "Send Naira" },
              { href: "/swap", label: "Swap" },
              { href: "/bills", label: "Pay bill" },
              { href: "/withdraw", label: "Withdraw" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-center text-[10px] font-medium text-muted transition-colors hover:text-fg"
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>
      </div>

      <DemoNotice>
        AI replies can be wrong. Nearvora treats every reply as untrusted input: balances, quotes,
        fees and recipients are re-derived by the backend before any plan is created or executed.
      </DemoNotice>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Conversation history"
        description="Saved demo conversations."
        size="sm"
        footer={
          <Button size="sm" className="w-full" onClick={newChat}>
            <Plus className="size-3.5" /> Start a new conversation
          </Button>
        }
      >
        <div className="space-y-1">
          {history.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-muted">No saved conversations yet.</p>
          ) : (
            history.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => void loadConversation(conversation.id)}
                className={`flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  conversationId === conversation.id
                    ? "bg-surface-3 text-fg"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <span className="truncate text-[11px] font-medium">{conversation.title}</span>
                <span className="text-[9px] text-muted-2">
                  {conversation.messageCount} messages · {relativeTime(conversation.updatedAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </Modal>

      <PlanReviewModal
        plan={reviewPlan}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onExecuted={(executed) => {
          setReviewPlan(executed);
          setPlans((current) => ({ ...current, [executed.id]: executed }));
        }}
      />
    </div>
  );
}

function MessageBubble({
  message,
  plan,
  onReview,
  onModify,
}: {
  message: ChatMessage;
  plan?: TransactionPlan;
  onReview: (planId: string) => void;
  onModify: () => void;
}) {
  const isUser = message.role === "user";
  const toolCalls = message.meta?.toolCalls ?? [];

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2.5">
        <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-accent px-3.5 py-2.5 text-[12px] leading-5 text-white">
          {message.content}
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-muted">
          <UserRound className="size-4" />
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-accent/25 bg-accent/10">
        <LogoMark className="size-4" />
      </span>
      <div className="min-w-0 max-w-[88%] flex-1">
        <div className="rounded-2xl rounded-tl-md border border-line bg-surface-2 px-3.5 py-3">
          <MessageText content={message.content} />
          {message.meta ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line/70 pt-2">
              <Badge variant={message.meta.planner === "fallback" ? "warning" : "accent"}>
                {message.meta.planner === "model"
                  ? message.meta.modelName ?? "AI model"
                  : message.meta.planner === "fallback"
                    ? "Dev planner"
                    : "System"}
              </Badge>
              <Badge variant="warning">Simulated</Badge>
              {toolCalls.length > 0 ? (
                <details className="group w-full">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-[9px] text-muted-2 hover:text-muted">
                    <Wrench className="size-2.5" />
                    {toolCalls.length} backend tool{toolCalls.length === 1 ? "" : "s"} used
                  </summary>
                  <div className="mt-1.5 space-y-1">
                    {toolCalls.map((call, index) => (
                      <div key={`${call.name}-${index}`} className="flex items-start gap-1.5">
                        {call.status === "ok" ? (
                          <CheckCircle2 className="mt-0.5 size-2.5 shrink-0 text-success" />
                        ) : (
                          <XCircle className="mt-0.5 size-2.5 shrink-0 text-danger" />
                        )}
                        <span className="text-[9px] leading-3.5 text-muted-2">
                          <span className="font-mono text-muted">{call.name}</span> — {call.summary}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>

        {plan ? (
          <div className="mt-2">
            <PlanSummaryCard
              plan={plan}
              onReview={() => onReview(plan.id)}
              onModify={onModify}
              compact
            />
          </div>
        ) : null}

        <p className="mt-1 px-1 text-[9px] text-muted-2">
          {relativeTime(message.createdAt)} · plan not executed without approval
        </p>
      </div>
    </div>
  );
}

function MessageText({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5 text-[12px] leading-5 text-muted">
      {lines.map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-1" />;
        if (/^\d+\.\s/.test(line)) {
          return (
            <p key={index} className="pl-1 font-medium text-fg">
              {renderInline(line)}
            </p>
          );
        }
        if (/^[-•]\s/.test(line) || /^\s+[•·-]\s/.test(line)) {
          return (
            <p key={index} className="flex gap-2 pl-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-lavender" />
              <span>{renderInline(line.replace(/^\s*[-•·]\s/, ""))}</span>
            </p>
          );
        }
        if (line.startsWith("_") && line.endsWith("_") && line.length > 2) {
          return (
            <p key={index} className="text-[10px] italic text-muted-2">
              {line.slice(1, -1)}
            </p>
          );
        }
        if (line.startsWith("Warnings:")) {
          return (
            <p key={index} className="flex items-center gap-1.5 font-medium text-warning">
              <AlertTriangle className="size-3" /> Warnings
            </p>
          );
        }
        return <p key={index}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function AssistantPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <AssistantClient />
    </React.Suspense>
  );
}
