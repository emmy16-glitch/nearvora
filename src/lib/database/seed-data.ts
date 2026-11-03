import { demoReceiveAddress, type AssetSymbol } from "@/lib/config/assets";
import type {
  Beneficiary,
  Bill,
  ChatMessage,
  Conversation,
  Notification,
  Transaction,
  User,
  WalletAsset,
} from "@/lib/types/domain";

export const DEMO_USER: User = {
  id: "user_demo_nearvora",
  name: "Tobi Adebayo",
  email: "tobi@nearvora.demo",
  phone: "+234 801 555 0192",
  kycStatus: "pending",
  createdAt: daysAgo(84),
};

export const DEMO_BALANCES: { symbol: AssetSymbol; available: string; pending: string }[] = [
  { symbol: "NGN", available: "125000000", pending: "2500000" },
  { symbol: "USDT", available: "1845500000", pending: "0" },
  { symbol: "USDC", available: "420000000", pending: "0" },
  { symbol: "BTC", available: "2640000", pending: "0" },
  { symbol: "ETH", available: "840000000000000000", pending: "0" },
];

export const DEMO_BENEFICIARIES: Beneficiary[] = [
  {
    id: "ben_brother",
    userId: DEMO_USER.id,
    type: "bank",
    name: "Emmanuel Okafor",
    nickname: "Brother",
    bankName: "GTBank",
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

export const DEMO_WALLETS: WalletAsset[] = DEMO_BALANCES.map((balance, index) => ({
  id: ["wa_ngn", "wa_usdt", "wa_usdc", "wa_btc", "wa_eth"][index],
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
    title: "Naira deposit",
    description: "Demo bank transfer received",
    asset: "NGN",
    amount: "25000000",
    fee: "0",
    counterparty: "Demo virtual account",
    hoursAgo: 31,
  }),
  tx({
    id: "tx_002",
    reference: "NVV-7C1M4P-2",
    type: "swap",
    status: "completed",
    direction: "neutral",
    title: "Converted NGN to USDT",
    description: "Simulated conversion at demo rate",
    asset: "NGN",
    amount: "15000000",
    fee: "90000",
    counterparty: "Nearvora swap",
    hoursAgo: 56,
  }),
  tx({
    id: "tx_003",
    reference: "NVV-5A8R2T-3",
    type: "transfer",
    status: "completed",
    direction: "out",
    title: "Transfer to Emmanuel Okafor",
    description: "GTBank ••6789",
    asset: "NGN",
    amount: "8500000",
    fee: "10000",
    counterparty: "Emmanuel Okafor",
    hoursAgo: 79,
  }),
  tx({
    id: "tx_004",
    reference: "NVV-3D6Y1U-4",
    type: "bill_payment",
    status: "completed",
    direction: "out",
    title: "Electricity payment",
    description: "Ikeja Electric • Home prepaid meter",
    asset: "NGN",
    amount: "1840000",
    fee: "10000",
    counterparty: "Ikeja Electric (IKEDC)",
    hoursAgo: 102,
  }),
  tx({
    id: "tx_005",
    reference: "NVV-9E4W7I-5",
    type: "crypto_receive",
    status: "completed",
    direction: "in",
    title: "USDT received",
    description: "NEAR Testnet (demo)",
    asset: "USDT",
    amount: "500000000",
    fee: "0",
    counterparty: "demo_usdt_sender_nearvora",
    hoursAgo: 126,
  }),
  tx({
    id: "tx_006",
    reference: "NVV-2H5J8L-6",
    type: "withdrawal",
    status: "pending",
    direction: "out",
    title: "Naira withdrawal",
    description: "Access Bank ••4321 — awaiting demo settlement",
    asset: "NGN",
    amount: "12000000",
    fee: "10000",
    counterparty: "Adaeze Nwosu",
    hoursAgo: 18,
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
    content: "What can you help me do with my money?",
    createdAt: daysAgo(1),
  },
  {
    id: "msg_welcome_assistant",
    conversationId: "conv_welcome",
    role: "assistant",
    content:
      "I can review your balances, prepare bank transfers, convert between Naira and crypto, pay bills, and build a single plan you approve. In this demo, every balance and execution is simulated. Tell me what you want to do — for example, “Send ₦50,000 to my brother and convert ₦100,000 to USDT.”",
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
