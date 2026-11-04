import { demoReceiveAddress, type AssetSymbol } from "@/lib/config/assets";
import type {
  Beneficiary,
  Bill,
  ChatMessage,
  Conversation,
  Notification,
  Quote,
  Transaction,
  TransactionPlan,
  User,
  WalletAsset,
} from "@/lib/types/domain";

export const DEMO_USER: User = {
  id: "user_demo_nearvora",
  name: "Emmanuel Okunola",
  email: "emmanuelokunola16@gmail.com",
  phone: "+234 801 555 0192",
  kycStatus: "verified",
  createdAt: daysAgo(84),
};

/**
 * Demo balances. Values are internally consistent with the demo rates:
 * NGN 1,250,000 + USDT 300 × ₦1,375 = ₦1,662,500 total portfolio.
 */
export const DEMO_BALANCES: { symbol: AssetSymbol; available: string; pending: string }[] = [
  { symbol: "NGN", available: "125000000", pending: "0" },
  { symbol: "USDT", available: "300000000", pending: "0" },
  { symbol: "USDC", available: "0", pending: "0" },
  { symbol: "BTC", available: "100000", pending: "0" },
  { symbol: "ETH", available: "0", pending: "0" },
  { symbol: "SOL", available: "0", pending: "0" },
  { symbol: "BNB", available: "0", pending: "0" },
];

export const DEMO_BENEFICIARIES: Beneficiary[] = [
  {
    id: "ben_brother",
    userId: DEMO_USER.id,
    type: "bank",
    name: "John Doe",
    nickname: "Brother",
    bankName: "Providus Bank",
    accountNumber: "0123456789",
    risk: "trusted",
    createdAt: daysAgo(60),
  },
  {
    id: "ben_adaeze",
    userId: DEMO_USER.id,
    type: "bank",
    name: "Adaeze Nwosu",
    bankName: "Access Bank",
    accountNumber: "0987654321",
    risk: "trusted",
    createdAt: daysAgo(40),
  },
  {
    id: "ben_usdt_wallet",
    userId: DEMO_USER.id,
    type: "crypto",
    name: "Nearvora demo treasury",
    nickname: "Demo USDT",
    address: "demo_usdt_near_testnet_recipient_nearvora",
    network: "near-testnet",
    risk: "new",
    createdAt: daysAgo(12),
  },
];

export const DEMO_BILLS: Bill[] = [
  {
    id: "bill_ikedc",
    userId: DEMO_USER.id,
    category: "electricity",
    provider: "Ikeja Electric (IKEDC)",
    accountReference: "45012345678",
    nickname: "Home prepaid meter",
    outstanding: "1840000",
    currency: "NGN",
    demo: true,
  },
  {
    id: "bill_mtn_airtime",
    userId: DEMO_USER.id,
    category: "airtime",
    provider: "MTN",
    accountReference: "+234 801 555 0192",
    nickname: "Personal line",
    currency: "NGN",
    demo: true,
  },
  {
    id: "bill_mtn_data",
    userId: DEMO_USER.id,
    category: "data",
    provider: "MTN",
    accountReference: "+234 801 555 0192",
    nickname: "Personal data line",
    currency: "NGN",
    demo: true,
  },
];

const walletIds: Record<AssetSymbol, string> = {
  NGN: "wa_ngn",
  USDT: "wa_usdt",
  USDC: "wa_usdc",
  BTC: "wa_btc",
  ETH: "wa_eth",
  SOL: "wa_sol",
  BNB: "wa_bnb",
};

export const DEMO_WALLETS: WalletAsset[] = DEMO_BALANCES.map((balance) => ({
  id: walletIds[balance.symbol],
  userId: DEMO_USER.id,
  symbol: balance.symbol,
  available: balance.available,
  pending: balance.pending,
  address: demoReceiveAddress(balance.symbol, networkFor(balance.symbol)),
  network: networkFor(balance.symbol),
  updatedAt: new Date().toISOString(),
}));

export const DEMO_TRANSACTIONS: Transaction[] = [
  tx({
    id: "tx_001",
    reference: "NVV-8F2K9Q-1",
    type: "deposit",
    status: "completed",
    direction: "in",
    title: "Salary Credit",
    description: "From ACME Ltd",
    asset: "NGN",
    amount: "50000000",
    fee: "0",
    counterparty: "ACME Ltd",
    hoursAgo: 20,
  }),
  tx({
    id: "tx_002",
    reference: "NVV-7C1M4P-2",
    type: "transfer",
    status: "completed",
    direction: "out",
    title: "Transfer",
    description: "To John Doe",
    asset: "NGN",
    amount: "10000000",
    fee: "10000",
    counterparty: "John Doe",
    hoursAgo: 30,
  }),
  tx({
    id: "tx_003",
    reference: "NVV-5A8R2T-3",
    type: "withdrawal",
    status: "completed",
    direction: "out",
    title: "Withdrawal",
    description: "To GTBank",
    asset: "NGN",
    amount: "5000000",
    fee: "10000",
    counterparty: "GTBank",
    hoursAgo: 44,
  }),
  tx({
    id: "tx_004",
    reference: "NVV-3D6Y1U-4",
    type: "swap",
    status: "completed",
    direction: "neutral",
    title: "Swapped NGN → USDT",
    description: "Simulated conversion at demo rate",
    asset: "USDT",
    amount: "150000000",
    fee: "90000",
    counterparty: "Nearvora swap",
    hoursAgo: 52,
  }),
  tx({
    id: "tx_005",
    reference: "NVV-9E4W7I-5",
    type: "crypto_receive",
    status: "completed",
    direction: "in",
    title: "Received USDT",
    description: "From 0x71…4e2f",
    asset: "USDT",
    amount: "100000000",
    fee: "0",
    counterparty: "0x71…4e2f",
    hoursAgo: 66,
  }),
  tx({
    id: "tx_006",
    reference: "NVV-2H5J8L-6",
    type: "transfer",
    status: "completed",
    direction: "out",
    title: "Bank Transfer",
    description: "To Providus Bank",
    asset: "NGN",
    amount: "20000000",
    fee: "10000",
    counterparty: "Providus Bank",
    hoursAgo: 78,
  }),
  tx({
    id: "tx_007",
    reference: "NVV-6K1N3B-7",
    type: "swap",
    status: "completed",
    direction: "neutral",
    title: "Swapped USDT to USDC",
    description: "Simulated stablecoin swap",
    asset: "USDT",
    amount: "200000000",
    fee: "1200000",
    counterparty: "Nearvora swap",
    hoursAgo: 150,
  }),
  tx({
    id: "tx_008",
    reference: "NVV-4M7P2V-8",
    type: "airtime",
    status: "completed",
    direction: "out",
    title: "MTN airtime",
    description: "+234 801 555 0192",
    asset: "NGN",
    amount: "500000",
    fee: "0",
    counterparty: "MTN",
    hoursAgo: 168,
  }),
  tx({
    id: "tx_009",
    reference: "NVV-1R9S5X-9",
    type: "crypto_send",
    status: "failed",
    direction: "out",
    title: "Bitcoin send failed",
    description: "Simulated network rejection — no funds moved",
    asset: "BTC",
    amount: "420000",
    fee: "4000",
    counterparty: "demo_btc_recipient_nearvora",
    hoursAgo: 190,
  }),
  tx({
    id: "tx_010",
    reference: "NVV-0T3U6Z-10",
    type: "transfer",
    status: "processing",
    direction: "out",
    title: "Transfer to Adaeze Nwosu",
    description: "Access Bank ••4321",
    asset: "NGN",
    amount: "3500000",
    fee: "10000",
    counterparty: "Adaeze Nwosu",
    hoursAgo: 1,
  }),
];

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_welcome",
    userId: DEMO_USER.id,
    title: "Money plan for this month",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

export const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "msg_welcome_user",
    conversationId: "conv_welcome",
    role: "user",
    content: "Convert 100k to USDT and send it to my wallet",
    createdAt: daysAgo(1),
  },
  {
    id: "msg_welcome_assistant",
    conversationId: "conv_welcome",
    role: "assistant",
    content:
      "Got it! Here's the plan:\n\n1. Convert ₦100,000 to USDT\n   • Estimated: ~64.5 USDT\n\n2. Send 64.5 USDT to:\n   • 0x71…4e2f\n\nTotal Fee: ~$0.50",
    planId: "plan_welcome_demo",
    meta: {
      simulated: true,
      planner: "system",
      toolCalls: [
        { name: "getWalletBalances", status: "ok", summary: "Demo balances loaded" },
      ],
    },
    createdAt: daysAgo(1),
  },
];

const welcomeExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

export const DEMO_QUOTES: Quote[] = [
  {
    id: "quote_welcome_demo",
    userId: DEMO_USER.id,
    from: "NGN",
    to: "USDT",
    fromAmount: "10000000",
    toAmount: "72037890",
    rate: "0.000724727272727272",
    fee: "60000",
    feeAsset: "NGN",
    spreadBps: 35,
    slippageBps: 0,
    simulated: true,
    expiresAt: welcomeExpiry,
    createdAt: daysAgo(0.1),
  },
];

export const DEMO_PLANS: TransactionPlan[] = [
  {
    id: "plan_welcome_demo",
    userId: DEMO_USER.id,
    conversationId: "conv_welcome",
    status: "AWAITING_APPROVAL",
    title: "Convert NGN and send USDT",
    summary: "Convert ₦100,000 to USDT and send it to the demo wallet.",
    operations: [
      {
        id: "op_welcome_swap",
        kind: "swap",
        status: "pending",
        title: "Convert NGN to USDT",
        asset: "NGN",
        amount: "10000000",
        fee: "60000",
        targetAsset: "USDT",
        targetAmount: "72037890",
        rate: "0.000724727272727272",
        quoteId: "quote_welcome_demo",
        recipientDetail: "₦100,000.00 → 72.03789 USDT",
        simulated: true,
      },
      {
        id: "op_welcome_send",
        kind: "crypto_transfer",
        status: "pending",
        title: "Send USDT to demo wallet",
        asset: "USDT",
        amount: "72037890",
        fee: "800000",
        network: "Ethereum",
        recipientDetail: "0x71…4e2f",
        simulated: true,
      },
    ],
    warnings: [],
    totalNgn: "10000000",
    remainingNgn: "115000000",
    riskLevel: "low",
    requiresAcknowledgment: false,
    simulated: true,
    source: "ai",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    expiresAt: welcomeExpiry,
  },
];

export const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "notif_1",
    userId: DEMO_USER.id,
    title: "Demo mode is on",
    body: "Nearvora is running with simulated balances and providers. No real money moves.",
    kind: "system",
    read: false,
    createdAt: daysAgo(0.2),
  },
  {
    id: "notif_2",
    userId: DEMO_USER.id,
    title: "Transfer processing",
    body: "Your ₦35,000 demo transfer to Adaeze Nwosu is processing.",
    kind: "transaction",
    read: false,
    createdAt: hoursAgo(1),
  },
];

function networkFor(symbol: AssetSymbol): string {
  switch (symbol) {
    case "BTC":
      return "bitcoin-testnet";
    case "ETH":
      return "ethereum-sepolia";
    case "SOL":
      return "solana-testnet";
    case "BNB":
      return "bsc-testnet";
    case "NGN":
      return "ngn-bank";
    default:
      return "near-testnet";
  }
}

function tx(input: {
  id: string;
  reference: string;
  type: Transaction["type"];
  status: Transaction["status"];
  direction: Transaction["direction"];
  title: string;
  description: string;
  asset: AssetSymbol;
  amount: string;
  fee: string;
  counterparty: string;
  hoursAgo: number;
}): Transaction {
  return {
    id: input.id,
    userId: DEMO_USER.id,
    reference: input.reference,
    type: input.type,
    status: input.status,
    direction: input.direction,
    title: input.title,
    description: input.description,
    asset: input.asset,
    amount: input.amount,
    fee: input.fee,
    counterparty: input.counterparty,
    simulated: true,
    createdAt: hoursAgo(input.hoursAgo),
    completedAt:
      input.status === "completed" ? hoursAgo(input.hoursAgo - 0.1) : undefined,
  };
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function daysAgo(days: number): string {
  return hoursAgo(days * 24);
}
