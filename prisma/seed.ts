import { Prisma, PrismaClient } from "@prisma/client";
import {
  DEMO_BENEFICIARIES,
  DEMO_BILLS,
  DEMO_CONVERSATIONS,
  DEMO_MESSAGES,
  DEMO_NOTIFICATIONS,
  DEMO_TRANSACTIONS,
  DEMO_USER,
  DEMO_WALLETS,
} from "../src/lib/database/seed-data";

const prisma = new PrismaClient();

const KYC = {
  unverified: "UNVERIFIED",
  pending: "PENDING",
  verified: "VERIFIED",
} as const;

const BENEFICIARY_TYPE = {
  bank: "BANK",
  crypto: "CRYPTO",
} as const;

const BENEFICIARY_RISK = {
  trusted: "TRUSTED",
  new: "NEW",
} as const;

const TRANSACTION_TYPE = {
  deposit: "DEPOSIT",
  withdrawal: "WITHDRAWAL",
  transfer: "TRANSFER",
  swap: "SWAP",
  bill_payment: "BILL_PAYMENT",
  airtime: "AIRTIME",
  data: "DATA",
  crypto_receive: "CRYPTO_RECEIVE",
  crypto_send: "CRYPTO_SEND",
} as const;

const TRANSACTION_STATUS = {
  pending: "PENDING",
  processing: "PROCESSING",
  completed: "COMPLETED",
  failed: "FAILED",
  cancelled: "CANCELLED",
} as const;

const TRANSACTION_DIRECTION = {
  in: "IN",
  out: "OUT",
  neutral: "NEUTRAL",
} as const;

const CHAT_ROLE = {
  user: "USER",
  assistant: "ASSISTANT",
  system: "SYSTEM",
} as const;

const BILL_CATEGORY = {
  electricity: "ELECTRICITY",
  airtime: "AIRTIME",
  data: "DATA",
} as const;

const NOTIFICATION_KIND = {
  transaction: "TRANSACTION",
  security: "SECURITY",
  system: "SYSTEM",
} as const;

async function main() {
  await prisma.$transaction([
    prisma.chatMessage.deleteMany(),
    prisma.approval.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.transactionPlan.deleteMany(),
    prisma.quote.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.walletAsset.deleteMany(),
    prisma.beneficiary.deleteMany(),
    prisma.bill.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.idempotencyRecord.deleteMany(),
    prisma.webhookEvent.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  await prisma.user.create({
    data: {
      id: DEMO_USER.id,
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      phone: DEMO_USER.phone,
      kycStatus: KYC[DEMO_USER.kycStatus],
      createdAt: new Date(DEMO_USER.createdAt),
    },
  });

  await prisma.walletAsset.createMany({
    data: DEMO_WALLETS.map((wallet) => ({
      id: wallet.id,
      userId: wallet.userId,
      symbol: wallet.symbol,
      available: wallet.available,
      pending: wallet.pending,
      address: wallet.address,
      network: wallet.network,
      updatedAt: new Date(wallet.updatedAt),
    })),
  });

  await prisma.beneficiary.createMany({
    data: DEMO_BENEFICIARIES.map((beneficiary) => ({
      id: beneficiary.id,
      userId: beneficiary.userId,
      type: BENEFICIARY_TYPE[beneficiary.type],
      name: beneficiary.name,
      nickname: beneficiary.nickname,
      bankName: beneficiary.bankName,
      accountNumber: beneficiary.accountNumber,
      address: beneficiary.address,
      network: beneficiary.network,
      risk: BENEFICIARY_RISK[beneficiary.risk],
      createdAt: new Date(beneficiary.createdAt),
    })),
  });

  await prisma.transaction.createMany({
    data: DEMO_TRANSACTIONS.map((transaction) => ({
      id: transaction.id,
      userId: transaction.userId,
      reference: transaction.reference,
      type: TRANSACTION_TYPE[transaction.type],
      status: TRANSACTION_STATUS[transaction.status],
      direction: TRANSACTION_DIRECTION[transaction.direction],
      title: transaction.title,
      description: transaction.description,
      asset: transaction.asset,
      amount: transaction.amount,
      fee: transaction.fee,
      counterparty: transaction.counterparty,
      note: transaction.note,
      simulated: transaction.simulated,
      createdAt: new Date(transaction.createdAt),
      completedAt: transaction.completedAt ? new Date(transaction.completedAt) : null,
    })),
  });

  await prisma.bill.createMany({
    data: DEMO_BILLS.map((bill) => ({
      id: bill.id,
      userId: bill.userId,
      category: BILL_CATEGORY[bill.category],
      provider: bill.provider,
      accountReference: bill.accountReference,
      nickname: bill.nickname,
      outstanding: bill.outstanding,
      currency: bill.currency,
      demo: bill.demo,
    })),
  });

  await prisma.conversation.createMany({
    data: DEMO_CONVERSATIONS.map((conversation) => ({
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      createdAt: new Date(conversation.createdAt),
      updatedAt: new Date(conversation.updatedAt),
    })),
  });

  await prisma.chatMessage.createMany({
    data: DEMO_MESSAGES.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      planId: message.planId,
      role: CHAT_ROLE[message.role],
      content: message.content,
      meta: message.meta
        ? (message.meta as unknown as Prisma.InputJsonValue)
        : undefined,
      createdAt: new Date(message.createdAt),
    })),
  });

  await prisma.notification.createMany({
    data: DEMO_NOTIFICATIONS.map((notification) => ({
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      body: notification.body,
      kind: NOTIFICATION_KIND[notification.kind],
      read: notification.read,
      createdAt: new Date(notification.createdAt),
    })),
  });

  await prisma.auditLog.create({
    data: {
      id: "audit_seed",
      userId: DEMO_USER.id,
      action: "demo.seed",
      entity: "system",
      entityId: "nearvora",
      metadata: { mode: "demo" },
    },
  });

  console.log(
    `Seeded demo user ${DEMO_USER.email} with ${DEMO_WALLETS.length} wallets, ` +
      `${DEMO_TRANSACTIONS.length} transactions and ${DEMO_BENEFICIARIES.length} beneficiaries.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
