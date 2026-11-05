import { randomUUID } from "node:crypto";
import { env } from "@/lib/config/env";
import type { AssetSymbol } from "@/lib/config/assets";
import type {
  Approval,
  AuditLog,
  Beneficiary,
  Bill,
  ChatMessage,
  Conversation,
  IdempotencyRecord,
  LiveSwap,
  Notification,
  Quote,
  Transaction,
  TransactionPlan,
  User,
  WalletAsset,
} from "@/lib/types/domain";
import {
  DEMO_BENEFICIARIES,
  DEMO_BILLS,
  DEMO_CONVERSATIONS,
  DEMO_MESSAGES,
  DEMO_NOTIFICATIONS,
  DEMO_PLANS,
  DEMO_QUOTES,
  DEMO_TRANSACTIONS,
  DEMO_USER,
  DEMO_WALLETS,
} from "./seed-data";

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function createReference(): string {
  const value = randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `NVV-${value.slice(0, 6)}-${value.slice(6)}`;
}

const clone = <T>(value: T): T => structuredClone(value);

/**
 * In-memory demo data store.
 *
 * The store is deliberately isolated behind this class so a Prisma-backed
 * repository can replace it without changing routes or the transaction engine.
 * Data resets when the server process restarts — this is demo mode, not custody.
 */
export class DemoStore {
  private users = new Map<string, User>();
  private wallets = new Map<string, WalletAsset>();
  private transactions = new Map<string, Transaction>();
  private beneficiaries = new Map<string, Beneficiary>();
  private bills = new Map<string, Bill>();
  private quotes = new Map<string, Quote>();
  private liveSwaps = new Map<string, LiveSwap>();
  private plans = new Map<string, TransactionPlan>();
  private approvals = new Map<string, Approval>();
  private conversations = new Map<string, Conversation>();
  private messages = new Map<string, ChatMessage>();
  private notifications = new Map<string, Notification>();
  private auditLogs: AuditLog[] = [];
  private idempotency = new Map<string, IdempotencyRecord>();

  constructor() {
    this.seed();
  }

  seed(): void {
    this.users.clear();
    this.wallets.clear();
    this.transactions.clear();
    this.beneficiaries.clear();
    this.bills.clear();
    this.quotes.clear();
    this.liveSwaps.clear();
    this.plans.clear();
    this.approvals.clear();
    this.conversations.clear();
    this.messages.clear();
    this.notifications.clear();
    this.auditLogs = [];
    this.idempotency.clear();

    this.users.set(DEMO_USER.id, clone(DEMO_USER));
    for (const wallet of DEMO_WALLETS) this.wallets.set(wallet.id, clone(wallet));
    for (const transaction of DEMO_TRANSACTIONS) {
      this.transactions.set(transaction.id, clone(transaction));
    }
    for (const beneficiary of DEMO_BENEFICIARIES) {
      this.beneficiaries.set(beneficiary.id, clone(beneficiary));
    }
    for (const bill of DEMO_BILLS) this.bills.set(bill.id, clone(bill));
    for (const quote of DEMO_QUOTES) this.quotes.set(quote.id, clone(quote));
    for (const plan of DEMO_PLANS) this.plans.set(plan.id, clone(plan));
    for (const conversation of DEMO_CONVERSATIONS) {
      this.conversations.set(conversation.id, clone(conversation));
    }
    for (const message of DEMO_MESSAGES) this.messages.set(message.id, clone(message));
    for (const notification of DEMO_NOTIFICATIONS) {
      this.notifications.set(notification.id, clone(notification));
    }
    this.auditLogs.push({
      id: createId("audit"),
      userId: DEMO_USER.id,
      action: "demo.seed",
      entity: "system",
      entityId: "nearvora",
      metadata: { mode: "demo" },
      createdAt: new Date().toISOString(),
    });
  }

  getUser(id: string): User | undefined {
    const user = this.users.get(id);
    return user ? clone(user) : undefined;
  }

  getDefaultUser(): User {
    return clone(DEMO_USER);
  }

  listAssets(userId: string): WalletAsset[] {
    return [...this.wallets.values()]
      .filter((wallet) => wallet.userId === userId)
      .sort((a, b) => assetOrder(a.symbol) - assetOrder(b.symbol))
      .map(clone);
  }

  getAsset(userId: string, symbol: AssetSymbol): WalletAsset | undefined {
    const wallet = [...this.wallets.values()].find(
      (item) => item.userId === userId && item.symbol === symbol,
    );
    return wallet ? clone(wallet) : undefined;
  }

  updateAsset(userId: string, symbol: AssetSymbol, update: Partial<WalletAsset>): WalletAsset {
    const wallet = [...this.wallets.values()].find(
      (item) => item.userId === userId && item.symbol === symbol,
    );
    if (!wallet) throw new Error(`Wallet asset ${symbol} not found`);
    Object.assign(wallet, update, { updatedAt: new Date().toISOString() });
    return clone(wallet);
  }

  lockAsset(userId: string, symbol: AssetSymbol, amount: string): void {
    const wallet = [...this.wallets.values()].find(
      (item) => item.userId === userId && item.symbol === symbol,
    );
    if (!wallet) throw new Error(`Wallet asset ${symbol} not found`);
    wallet.available = subtract(wallet.available, amount);
    wallet.updatedAt = new Date().toISOString();
  }

  creditAsset(userId: string, symbol: AssetSymbol, amount: string): void {
    const wallet = [...this.wallets.values()].find(
      (item) => item.userId === userId && item.symbol === symbol,
    );
    if (!wallet) throw new Error(`Wallet asset ${symbol} not found`);
    wallet.available = add(wallet.available, amount);
    wallet.updatedAt = new Date().toISOString();
  }

  listTransactions(
    userId: string,
    filter: { status?: string; type?: string; limit?: number } = {},
  ): Transaction[] {
    return [...this.transactions.values()]
      .filter((transaction) => transaction.userId === userId)
      .filter((transaction) => !filter.status || transaction.status === filter.status)
      .filter((transaction) => !filter.type || transaction.type === filter.type)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filter.limit ?? 100)
      .map(clone);
  }

  getTransaction(id: string): Transaction | undefined {
    const transaction = this.transactions.get(id);
    return transaction ? clone(transaction) : undefined;
  }

  addTransaction(transaction: Transaction): Transaction {
    this.transactions.set(transaction.id, clone(transaction));
    return clone(transaction);
  }

  listBeneficiaries(userId: string): Beneficiary[] {
    return [...this.beneficiaries.values()]
      .filter((beneficiary) => beneficiary.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(clone);
  }

  getBeneficiary(id: string): Beneficiary | undefined {
    const beneficiary = this.beneficiaries.get(id);
    return beneficiary ? clone(beneficiary) : undefined;
  }

  addBeneficiary(beneficiary: Beneficiary): Beneficiary {
    this.beneficiaries.set(beneficiary.id, clone(beneficiary));
    return clone(beneficiary);
  }

  listBills(userId: string): Bill[] {
    return [...this.bills.values()]
      .filter((bill) => bill.userId === userId)
      .map(clone);
  }

  getBill(id: string): Bill | undefined {
    const bill = this.bills.get(id);
    return bill ? clone(bill) : undefined;
  }

  addQuote(quote: Quote): Quote {
    this.quotes.set(quote.id, clone(quote));
    return clone(quote);
  }

  getQuote(id: string): Quote | undefined {
    const quote = this.quotes.get(id);
    return quote ? clone(quote) : undefined;
  }

  addLiveSwap(swap: LiveSwap): LiveSwap {
    this.liveSwaps.set(swap.id, clone(swap));
    return clone(swap);
  }

  getLiveSwap(id: string): LiveSwap | undefined {
    const swap = this.liveSwaps.get(id);
    return swap ? clone(swap) : undefined;
  }

  updateLiveSwap(id: string, update: Partial<LiveSwap>): LiveSwap {
    const swap = this.liveSwaps.get(id);
    if (!swap) throw new Error("Live swap not found");
    Object.assign(swap, update, { updatedAt: new Date().toISOString() });
    return clone(swap);
  }

  listLiveSwaps(userId: string, limit = 50): LiveSwap[] {
    return [...this.liveSwaps.values()]
      .filter((swap) => swap.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(clone);
  }

  addPlan(plan: TransactionPlan): TransactionPlan {
    this.plans.set(plan.id, clone(plan));
    return clone(plan);
  }

  getPlan(id: string): TransactionPlan | undefined {
    const plan = this.plans.get(id);
    return plan ? clone(plan) : undefined;
  }

  updatePlan(id: string, update: Partial<TransactionPlan>): TransactionPlan {
    const plan = this.plans.get(id);
    if (!plan) throw new Error("Plan not found");
    Object.assign(plan, update, { updatedAt: new Date().toISOString() });
    return clone(plan);
  }

  listPlans(userId: string, limit = 20): TransactionPlan[] {
    return [...this.plans.values()]
      .filter((plan) => plan.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(clone);
  }

  addApproval(approval: Approval): Approval {
    this.approvals.set(approval.id, clone(approval));
    return clone(approval);
  }

  getApprovals(planId: string): Approval[] {
    return [...this.approvals.values()]
      .filter((approval) => approval.planId === planId)
      .map(clone);
  }

  getConversation(id: string): Conversation | undefined {
    const conversation = this.conversations.get(id);
    return conversation ? clone(conversation) : undefined;
  }

  listConversations(userId: string, limit = 20): Conversation[] {
    return [...this.conversations.values()]
      .filter((conversation) => conversation.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map(clone);
  }

  createConversation(conversation: Conversation): Conversation {
    this.conversations.set(conversation.id, clone(conversation));
    return clone(conversation);
  }

  touchConversation(id: string, title?: string): void {
    const conversation = this.conversations.get(id);
    if (!conversation) return;
    conversation.updatedAt = new Date().toISOString();
    if (title) conversation.title = title;
  }

  addMessage(message: ChatMessage): ChatMessage {
    this.messages.set(message.id, clone(message));
    return clone(message);
  }

  listMessages(conversationId: string, limit = 100): ChatMessage[] {
    return [...this.messages.values()]
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-limit)
      .map(clone);
  }

  listNotifications(userId: string): Notification[] {
    return [...this.notifications.values()]
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(clone);
  }

  markNotificationsRead(userId: string): void {
    for (const notification of this.notifications.values()) {
      if (notification.userId === userId) notification.read = true;
    }
  }

  addNotification(notification: Notification): void {
    this.notifications.set(notification.id, clone(notification));
  }

  addAuditLog(log: AuditLog): void {
    this.auditLogs.unshift(clone(log));
    if (this.auditLogs.length > 500) this.auditLogs.length = 500;
  }

  listAuditLogs(userId: string, limit = 50): AuditLog[] {
    return this.auditLogs
      .filter((log) => log.userId === userId)
      .slice(0, limit)
      .map(clone);
  }

  getIdempotency(key: string, userId: string, scope: string): IdempotencyRecord | undefined {
    const record = this.idempotency.get(`${userId}:${scope}:${key}`);
    return record ? clone(record) : undefined;
  }

  setIdempotency(key: string, userId: string, scope: string, result: unknown): void {
    this.idempotency.set(`${userId}:${scope}:${key}`, {
      key,
      userId,
      scope,
      result: clone(result),
      createdAt: new Date().toISOString(),
    });
  }

  stats(): { transactions: number; plans: number; liveSwaps: number; auditLogs: number } {
    return {
      transactions: this.transactions.size,
      plans: this.plans.size,
      liveSwaps: this.liveSwaps.size,
      auditLogs: this.auditLogs.length,
    };
  }
}

function assetOrder(symbol: AssetSymbol): number {
  return ["NGN", "USDT", "USDC", "BTC", "ETH"].indexOf(symbol);
}

function add(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

function subtract(a: string, b: string): string {
  return (BigInt(a) - BigInt(b)).toString();
}

const globalForStore = globalThis as unknown as { __nearvoraStore?: DemoStore };

export function getStore(): DemoStore {
  if (!env.demoMode) {
    throw new Error(
      "LIVE mode is not available in this build. Refusing to serve in-memory demo balances or transactions as live customer data. Set DEMO_MODE=true or implement and verify the persistent repository and provider adapters.",
    );
  }
  if (!globalForStore.__nearvoraStore) {
    globalForStore.__nearvoraStore = new DemoStore();
  }
  return globalForStore.__nearvoraStore;
}
