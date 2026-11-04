import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEMO_USER } from "@/lib/database/seed-data";
import { getStore } from "@/lib/database/store";
import { handleChat } from "@/lib/services/ai/chat-service";

const savedKeys = {
  nearAi: process.env.NEAR_AI_KEY,
  nearAiModel: process.env.NEAR_AI_MODEL,
  ai: process.env.AI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
};

beforeAll(() => {
  delete process.env.NEAR_AI_KEY;
  delete process.env.NEAR_AI_MODEL;
  delete process.env.AI_API_KEY;
  delete process.env.OPENAI_API_KEY;
});

afterAll(() => {
  if (savedKeys.nearAi) process.env.NEAR_AI_KEY = savedKeys.nearAi;
  if (savedKeys.nearAiModel) process.env.NEAR_AI_MODEL = savedKeys.nearAiModel;
  if (savedKeys.ai) process.env.AI_API_KEY = savedKeys.ai;
  if (savedKeys.openai) process.env.OPENAI_API_KEY = savedKeys.openai;
});

describe("AI assistant fallback flow", () => {
  beforeEach(() => {
    getStore().seed();
  });

  it("turns the canonical multi-step request into one reviewable plan", async () => {
    const result = await handleChat({
      user: DEMO_USER,
      message:
        "I have ₦1,000,000. Send ₦200,000 to my brother, convert ₦300,000 to USDT, pay my electricity bill and leave the rest.",
    });

    expect(result.planner).toBe("fallback");
    expect(result.modelConnected).toBe(false);
    expect(result.plan).toBeDefined();
    expect(result.plan!.status).toBe("AWAITING_APPROVAL");
    expect(result.plan!.source).toBe("ai");
    expect(result.plan!.simulated).toBe(true);
    expect(result.plan!.operations.map((operation) => operation.kind)).toEqual(
      expect.arrayContaining(["bank_transfer", "swap", "bill_payment"]),
    );
    expect(result.plan!.operations).toHaveLength(3);
    const bill = result.plan!.operations.find((operation) => operation.kind === "bill_payment");
    expect(bill?.amount).toBe("1840000");
    expect(result.message.planId).toBe(result.plan!.id);
    expect(result.message.meta?.planner).toBe("fallback");
    expect(getStore().listTransactions(DEMO_USER.id)).toHaveLength(10);
  });

  it("asks for missing information instead of inventing it", async () => {
    const result = await handleChat({
      user: DEMO_USER,
      message: "Send some money to my brother",
    });

    expect(result.plan).toBeUndefined();
    expect(result.missingInformation.length).toBeGreaterThan(0);
    expect(result.message.content).toContain("more information");
  });

  it("accepts small crypto amounts below one kobo equivalent", async () => {
    const result = await handleChat({
      user: DEMO_USER,
      message: "Send 0.0001 BTC to demo_btc_recipient_nearvora",
    });

    expect(result.plan).toBeDefined();
    const transfer = result.plan!.operations.find(
      (operation) => operation.kind === "crypto_transfer",
    );
    expect(transfer?.amount).toBe("10000");
    expect(transfer?.asset).toBe("BTC");
  });

  it("preserves conversation and message history on the backend", async () => {
    const first = await handleChat({
      user: DEMO_USER,
      message: "Convert ₦100,000 to USDC",
    });
    const second = await handleChat({
      user: DEMO_USER,
      conversationId: first.conversationId,
      message: "How much is in my crypto wallet?",
    });

    expect(second.conversationId).toBe(first.conversationId);
    const messages = getStore().listMessages(first.conversationId);
    expect(messages.length).toBeGreaterThanOrEqual(4);
    expect(messages.some((message) => message.role === "user")).toBe(true);
    expect(messages.some((message) => message.role === "assistant")).toBe(true);
  });
});
