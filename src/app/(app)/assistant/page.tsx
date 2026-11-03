"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Lock,
  MessageSquarePlus,
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
import type {
  ChatMessage,
  Conversation,
  TransactionPlan,
} from "@/lib/types/domain";
import { relativeTime } from "@/lib/money/format";
import { PageHeader, Card } from "@/components/ui/card";
import { Badge, DemoBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSkeleton, Spinner } from "@/components/ui/states";
import { DemoNotice } from "@/components/ui/demo-notice";
import { PlanReviewModal, PlanSummaryCard } from "@/components/transactions/plan-review";

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
  "I have ₦1,000,000. Send ₦200,000 to my brother, convert ₦300,000 to USDT, pay my electricity bill and leave the rest.",
  "Convert ₦100,000 to USDC",
  "Pay my electricity bill",
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
  const [hydrated, setHydrated] = React.useState(false);
  const initialised = React.useRef(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const loadedConversation = React.useRef<string | null>(null);

  const loadConversation = React.useCallback(async (id: string) => {
    try {
      const detail = await apiFetch<ConversationDetail>(`/api/ai/conversations/${id}`);
      setConversationId(id);
      setMessages(detail.messages);
      setPlans(Object.fromEntries(detail.plans.map((plan) => [plan.id, plan])));
      setError(null);
      loadedConversation.current = id;
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
    loadedConversation.current = null;
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="AI mode"
        title="Nearvora assistant"
        description="Describe a financial outcome. The assistant checks backend data, prepares one structured plan and waits for your approval."
        action={
          <>
            <Badge variant={system.ai.configured ? "accent" : "warning"}>
              {system.ai.configured ? "Model connected" : "Dev planner"}
            </Badge>
            <Button variant="outline" size="sm" onClick={newChat}>
              <MessageSquarePlus className="size-3.5" /> New chat
            </Button>
          </>
        }
      />

      {!system.ai.configured ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-teal/20 bg-teal/[0.04] px-3.5 py-2.5">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-teal" />
          <p className="text-[10.5px] leading-4 text-muted">
            <strong className="text-fg">No AI model is connected.</strong> Requests use Nearvora&apos;s
            deterministic development planner, clearly labelled in every reply. It only reads saved
            demo beneficiaries, bills and backend balances. Configure <code>AI_API_KEY</code> to
            enable model-based intent extraction.
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="flex min-h-[560px] flex-col overflow-hidden lg:h-[calc(100dvh-230px)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <span className="grid size-8 place-items-center rounded-full border border-accent/25 bg-accent/10">
              <Bot className="size-4 text-accent" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-fg">Nearvora AI</p>
              <p className="text-[9.5px] text-muted-2">
                {system.ai.configured ? system.ai.model ?? "Configured model" : "Deterministic development planner"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <DemoBadge label="Simulated" />
              <StatusBadge status="AWAITING_APPROVAL" />
            </div>
          </div>

          {history.length > 0 ? (
            <div className="border-b border-line px-4 py-2">
              <label className="sr-only" htmlFor="conversation-select">
                Conversation
              </label>
              <select
                id="conversation-select"
                value={conversationId ?? ""}
                onChange={(event) => {
                  if (event.target.value) void loadConversation(event.target.value);
                }}
                className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[10.5px] text-muted outline-none focus:border-accent/50"
              >
                {!conversationId ? <option value="">New conversation</option> : null}
                {history.map((conversation) => (
                  <option key={conversation.id} value={conversation.id}>
                    {conversation.title} · {conversation.messageCount} messages
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !sending ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <span className="grid size-12 place-items-center rounded-2xl border border-accent/20 bg-accent/[0.06]">
                  <Sparkles className="size-5 text-accent" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-fg">
                  What would you like to do with your money?
                </h2>
                <p className="mt-1.5 max-w-sm text-[11px] leading-5 text-muted">
                  Ask in plain language. I can prepare transfers, conversions and bill payments in
                  one plan. I never execute without your approval.
                </p>
                <div className="mt-5 grid w-full max-w-lg gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setInput(suggestion)}
                      className="group flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 text-left text-[11px] leading-4 text-muted transition-colors hover:border-accent/30 hover:text-fg"
                    >
                      {suggestion}
                      <ChevronRight className="mt-0.5 size-3 shrink-0 text-muted-2 group-hover:text-accent" />
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
                />
              ))
            )}

            {sending ? (
              <div className="flex items-start gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-accent/25 bg-accent/10">
                  <Bot className="size-3.5 text-accent" />
                </span>
                <div className="rounded-2xl rounded-tl-sm border border-line bg-surface-2 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-[10.5px] text-muted">
                    <Spinner />
                    Checking balances, saved recipients and quotes…
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

          <div className="border-t border-line bg-surface/40 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                maxLength={2000}
                placeholder="e.g. Send ₦50,000 to my brother and convert ₦100,000 to USDT"
                className="min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-xs leading-5 text-fg outline-none placeholder:text-muted-2 focus:border-accent/50"
                disabled={sending}
                aria-label="Message the Nearvora assistant"
              />
              <Button
                size="icon"
                className="mb-0.5 size-10"
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                aria-label="Send message"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-1.5 px-1 text-[9px] leading-3.5 text-muted-2">
              The assistant prepares plans only. The backend validates balances, recipients, quotes
              and approvals. Demo execution moves no real money.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" />
              <h3 className="text-xs font-semibold text-fg">Guardrails</h3>
            </div>
            <ul className="mt-3 space-y-2.5">
              {[
                "Backend balances only — the model cannot invent them",
                "No wallet keys or direct signing from the AI",
                "Every plan needs explicit backend approval",
                "High-risk plans require extra acknowledgment",
                "Idempotency prevents duplicate execution",
                "OutLayer policy is evaluated before demo execution",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[10px] leading-4 text-muted">
                  <Lock className="mt-0.5 size-3 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-fg">Conversation history</h3>
            <div className="mt-3 space-y-1">
              {history.length === 0 ? (
                <p className="text-[10px] text-muted-2">No saved conversations yet.</p>
              ) : (
                history.slice(0, 8).map((conversation) => (
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
                    <span className="truncate text-[10.5px] font-medium">{conversation.title}</span>
                    <span className="text-[9px] text-muted-2">
                      {conversation.messageCount} messages · {relativeTime(conversation.updatedAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-fg">Manual handoff</h3>
            <p className="mt-2 text-[10px] leading-4 text-muted">
              Prefer direct controls? Every AI operation has a manual equivalent using the same
              backend engine.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
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
          </Card>
        </div>
      </div>

      <DemoNotice>
        AI replies can be wrong. Nearvora treats every reply as untrusted input: balances, quotes,
        fees and recipients are re-derived by the backend before any plan is created or executed.
      </DemoNotice>

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
}: {
  message: ChatMessage;
  plan?: TransactionPlan;
  onReview: (planId: string) => void;
}) {
  const isUser = message.role === "user";
  const truncation = message.meta?.toolCalls ?? [];

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2.5">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-accent px-3.5 py-2.5 text-[11.5px] leading-5 text-accent-ink">
          {message.content}
        </div>
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-muted">
          <UserRound className="size-3.5" />
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-accent/25 bg-accent/10">
        <Bot className="size-3.5 text-accent" />
      </span>
      <div className="min-w-0 max-w-[88%] flex-1">
        <div className="rounded-2xl rounded-tl-sm border border-line bg-surface-2 px-3.5 py-3">
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
              {truncation.length > 0 ? (
                <details className="group w-full">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-[9px] text-muted-2 hover:text-muted">
                    <Wrench className="size-2.5" />
                    {truncation.length} backend tool{truncation.length === 1 ? "" : "s"} used
                  </summary>
                  <div className="mt-1.5 space-y-1">
                    {truncation.map((call, index) => (
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
            <PlanSummaryCard plan={plan} onReview={() => onReview(plan.id)} compact />
          </div>
        ) : null}

        {message.meta?.missingInformation && message.meta.missingInformation.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { href: "/transfer", label: "Open transfer" },
              { href: "/swap", label: "Open swap" },
              { href: "/bills", label: "Open bills" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[9.5px] font-medium text-muted transition-colors hover:text-fg"
              >
                <CircleDot className="size-2.5" /> {link.label}
              </a>
            ))}
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
    <div className="space-y-1.5 text-[11.5px] leading-5 text-muted">
      {lines.map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-1" />;
        if (/^\d+\.\s/.test(line)) {
          return (
            <p key={index} className="pl-1 text-fg">
              {renderInline(line)}
            </p>
          );
        }
        if (/^[-•]\s/.test(line)) {
          return (
            <p key={index} className="flex gap-2 pl-1">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
              <span>{renderInline(line.replace(/^[-•]\s/, ""))}</span>
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
