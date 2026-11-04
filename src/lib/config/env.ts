const isProduction = process.env.NODE_ENV === "production";

/**
 * Central environment access. Nothing here is required at build time so that
 * demo builds work without credentials. Values that are required for a
 * production deployment are validated lazily when the relevant feature is used.
 */
export const env = {
  get demoMode() {
    return process.env.DEMO_MODE !== "false";
  },
  get sessionSecret() {
    const secret = process.env.SESSION_SECRET;
    if (secret && secret.length >= 24) return secret;
    if (!isProduction) {
      return "nearvora-development-session-secret-do-not-use-in-production";
    }
    throw new Error(
      "SESSION_SECRET must be set to a value of at least 24 characters in production.",
    );
  },
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get dataMode() {
    return process.env.DATA_MODE === "database" ? "database" : "demo";
  },
  get ai() {
    const apiKey = process.env.NEAR_AI_KEY ?? process.env.AI_API_KEY ?? "";
    const baseUrl = (
      process.env.NEAR_AI_BASE_URL ??
      process.env.AI_BASE_URL ??
      "https://cloud-api.near.ai/v1"
    ).replace(/\/+$/, "");
    const model = process.env.NEAR_AI_MODEL ?? process.env.AI_MODEL ?? "";
    return {
      apiKey,
      baseUrl,
      model,
      configured: Boolean(apiKey && model),
      timeoutMs: positiveInt(process.env.NEAR_AI_TIMEOUT_MS, 30_000),
      maxOutputTokens: positiveInt(process.env.NEAR_AI_MAX_OUTPUT_TOKENS, 1_200),
      maxSteps: positiveInt(process.env.NEAR_AI_MAX_STEPS, 4),
      dailyRequestLimit: positiveInt(process.env.NEAR_AI_DAILY_REQUEST_LIMIT, 60),
      dailyTokenLimit: positiveInt(process.env.NEAR_AI_DAILY_TOKEN_LIMIT, 60_000),
      inputCostPerMillion: optionalNumber(process.env.NEAR_AI_INPUT_COST_PER_MILLION),
      outputCostPerMillion: optionalNumber(process.env.NEAR_AI_OUTPUT_COST_PER_MILLION),
    };
  },
  get near() {
    return {
      network: process.env.NEAR_NETWORK ?? "testnet",
      intentsApiUrl: process.env.NEAR_INTENTS_API_URL ?? "",
      rpcUrl: process.env.NEAR_RPC_URL ?? "https://rpc.testnet.near.org",
      accountId: process.env.NEAR_ACCOUNT_ID ?? "",
      outlayerUrl: process.env.OUTLAYER_API_URL ?? "",
      outlayerKey: process.env.OUTLAYER_API_KEY ?? "",
    };
  },
  get payments() {
    return {
      provider: process.env.PAYMENT_PROVIDER ?? "demo",
      webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? "",
    };
  },
  get formance() {
    return {
      url: process.env.FORMANCE_LEDGER_URL ?? "",
      token: process.env.FORMANCE_LEDGER_TOKEN ?? "",
    };
  },
} as const;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function optionalNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export const DEMO_MODE = process.env.DEMO_MODE !== "false";
export const DATA_MODE = process.env.DATA_MODE === "database" ? "database" : "demo";
