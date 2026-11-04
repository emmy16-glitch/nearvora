import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/handler";
import { env } from "@/lib/config/env";
import { DEMO_USER } from "@/lib/database/seed-data";
import { getStore } from "@/lib/database/store";
import {
  clearModelCacheForTests,
  isAiConfigured,
} from "@/lib/ai/model-config";
import { getAiProviderStatus } from "@/lib/ai/provider";
import { checkAiHealth } from "@/lib/ai/health";
import { getPaymentProvider } from "@/lib/services/payments";
import { getNearIntentsAdapter } from "@/lib/services/intents";
import { getOutLayerAdapter } from "@/lib/services/outlayer";
import { getRates } from "@/lib/services/rates";
import { createPlan } from "@/lib/services/transactions/plan-service";
import { createPlanSchema } from "@/lib/validation/schemas";

const ENV_KEYS = [
  "DEMO_MODE",
  "NEAR_AI_KEY",
  "NEAR_AI_MODEL",
  "NEAR_AI_BASE_URL",
  "NEAR_AI_INPUT_COST_PER_MILLION",
  "NEAR_AI_OUTPUT_COST_PER_MILLION",
  "AI_PROVIDER",
  "AI_API_KEY",
  "AI_BASE_URL",
  "AI_MODEL",
  "OPENAI_API_KEY",
  "GROQ_API_KEY",
  "GROQ_MODEL",
  "GROQ_BASE_URL",
  "GROQ_INPUT_COST_PER_MILLION",
  "GROQ_OUTPUT_COST_PER_MILLION",
  "AI_TIMEOUT_MS",
  "AI_MAX_OUTPUT_TOKENS",
  "AI_MAX_STEPS",
  "AI_DAILY_REQUEST_LIMIT",
  "AI_DAILY_TOKEN_LIMIT",
  "AI_INPUT_COST_PER_MILLION",
  "AI_OUTPUT_COST_PER_MILLION",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  clearModelCacheForTests();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.unstubAllGlobals();
  clearModelCacheForTests();
});

describe("NEAR AI Cloud configuration", () => {
  it("does not reuse generic OpenAI/AI credentials", () => {
    process.env.AI_API_KEY = "some-other-provider-key";
    process.env.OPENAI_API_KEY = "another-provider-key";
    expect(isAiConfigured()).toBe(false);
  });

  it("selects Groq explicitly and does not reuse the NEAR key", () => {
    process.env.AI_PROVIDER = "groq";
    process.env.NEAR_AI_KEY = "near-ai-test-key";
    process.env.NEAR_AI_MODEL = "test/near-model";
    expect(isAiConfigured()).toBe(false);

    process.env.GROQ_API_KEY = "gsk-test-key";
    process.env.GROQ_MODEL = "openai/gpt-oss-120b";
    process.env.GROQ_BASE_URL = "https://api.groq.com/openai/v1";
    expect(isAiConfigured()).toBe(true);
    expect(env.ai.provider).toBe("groq");
    expect(env.ai.model).toBe("openai/gpt-oss-120b");
    expect(env.ai.baseUrl).toBe("https://api.groq.com/openai/v1");
  });

  it("requires the NEAR AI key, model and a valid base URL", () => {
    process.env.NEAR_AI_KEY = "near-ai-test-key";
    process.env.NEAR_AI_MODEL = "test/model";
    process.env.NEAR_AI_BASE_URL = "https://cloud-api.near.ai/v1";
    expect(isAiConfigured()).toBe(true);

    process.env.NEAR_AI_BASE_URL = "not a url";
    expect(isAiConfigured()).toBe(false);
  });

  it("never exposes the model identifier in customer-facing status", () => {
    process.env.NEAR_AI_KEY = "near-ai-test-key";
    process.env.NEAR_AI_MODEL = "provider/model-brand-name";
    process.env.NEAR_AI_BASE_URL = "https://cloud-api.near.ai/v1";

    const status = getAiProviderStatus();
    expect(status.assistant).toBe("Nearvora AI");
    expect(status.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain("provider/model-brand-name");
    expect(JSON.stringify(status)).not.toContain("near-ai-test-key");
  });

  it("verifies that the configured model exists in the provider model list", async () => {
    process.env.NEAR_AI_KEY = "near-ai-test-key";
    process.env.NEAR_AI_MODEL = "test/model";
    process.env.NEAR_AI_BASE_URL = "https://cloud-api.near.ai/v1";

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "test/model", owned_by: "test" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const report = await checkAiHealth();
    expect(report.status).toBe("unverified");
    expect(report.modelAvailable).toBe(true);
    expect(report.credentialVerified).toBeNull();
    expect(report.chatProbe).toBe("skipped");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.stringify(report)).not.toContain("near-ai-test-key");
  });

  it("confirms credentials only with an opt-in live probe", async () => {
    process.env.NEAR_AI_KEY = "near-ai-test-key";
    process.env.NEAR_AI_MODEL = "test/model";
    process.env.NEAR_AI_BASE_URL = "https://cloud-api.near.ai/v1";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/models")) {
        return new Response(JSON.stringify({ data: [{ id: "test/model" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: 1,
          model: "test/model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "OK" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 8, completion_tokens: 1, total_tokens: 9 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const report = await checkAiHealth({ probe: true, userId: "test-ai-health-probe" });
    expect(report.status).toBe("ok");
    expect(report.credentialVerified).toBe(true);
    expect(report.chatProbe).toBe("ok");
    expect(report.usage?.totalTokens).toBe(9);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(report)).not.toContain("near-ai-test-key");
  });

  it("reports a degraded state when the configured model is missing", async () => {
    process.env.NEAR_AI_KEY = "near-ai-test-key";
    process.env.NEAR_AI_MODEL = "missing/model";
    process.env.NEAR_AI_BASE_URL = "https://cloud-api.near.ai/v1";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ data: [{ id: "other/model" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const report = await checkAiHealth();
    expect(report.status).toBe("degraded");
    expect(report.modelAvailable).toBe(false);
  });
});

describe("LIVE mode fail-safe behavior", () => {
  beforeEach(() => {
    process.env.DEMO_MODE = "false";
  });

  it("refuses to serve the in-memory demo store in LIVE mode", () => {
    expect(() => getStore()).toThrow(/LIVE mode is not available/);
  });

  it("refuses to create or execute simulated plans in LIVE mode", () => {
    const input = createPlanSchema.parse({
      operations: [{ kind: "bank_transfer", amount: "100", beneficiaryId: "ben_brother" }],
    });

    try {
      createPlan(DEMO_USER.id, input);
      throw new Error("expected createPlan to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("LIVE_EXECUTION_DISABLED");
    }
  });

  it("never returns the demo payment provider in LIVE mode", async () => {
    const provider = getPaymentProvider();
    expect(provider.mode).toBe("live");
    await expect(provider.createVirtualAccount(DEMO_USER)).rejects.toThrow(/not configured/i);
  });

  it("fails closed for Intents, OutLayer and rates in LIVE mode", async () => {
    const intents = getNearIntentsAdapter();
    expect(intents.mode).toBe("live");
    expect(intents.isConfigured()).toBe(false);
    await expect(
      intents.getQuote({ from: "NGN", to: "USDT", amount: "100000" }),
    ).rejects.toThrow(/not configured/i);

    const outlayer = getOutLayerAdapter();
    expect(outlayer.mode).toBe("live");
    expect(() => outlayer.evaluatePlan({} as never)).toThrow(/not configured/i);

    try {
      getRates();
      throw new Error("expected getRates to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("LIVE_RATES_DISABLED");
    }
  });
});
