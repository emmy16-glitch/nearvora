const isProduction = process.env.NODE_ENV === "production";

export type AiProviderId = "near-ai-cloud" | "groq";

/**
 * Central environment access. Nothing here is required at build time so that
 * demo builds work without credentials. Values that are required for a
 * production deployment are validated lazily when the relevant feature is used.
 */
export const env = {
  get demoMode() {
    return process.env.DEMO_MODE !== "false";
  },
  get mode(): "demo" | "live" {
    return this.demoMode ? "demo" : "live";
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
    const provider: AiProviderId = process.env.AI_PROVIDER === "groq" ? "groq" : "near-ai-cloud";
    const isGroq = provider === "groq";

    // Credentials are provider-specific. Never fall back to a key belonging to
    // another provider: that could silently send financial context to the wrong
    // endpoint with the wrong credential.
    const apiKey = isGroq
      ? (process.env.GROQ_API_KEY ?? "")
      : (process.env.NEAR_AI_KEY ?? "");
    const baseUrl = (
      isGroq
        ? (process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1")
        : (process.env.NEAR_AI_BASE_URL ?? "https://cloud-api.near.ai/v1")
    ).replace(/\/+$/, "");
    const model = isGroq
      ? (process.env.GROQ_MODEL ?? "")
      : (process.env.NEAR_AI_MODEL ?? "");
    const providerPrefix = isGroq ? "GROQ" : "NEAR_AI";

    return {
      provider,
      apiKey,
      baseUrl,
      model,
      configured: Boolean(apiKey && model),
      timeoutMs: positiveInt(process.env.AI_TIMEOUT_MS, 60_000),
      maxOutputTokens: positiveInt(process.env.AI_MAX_OUTPUT_TOKENS, 4_096),
      maxSteps: positiveInt(process.env.AI_MAX_STEPS, 4),
      dailyRequestLimit: positiveInt(process.env.AI_DAILY_REQUEST_LIMIT, 200),
      dailyTokenLimit: positiveInt(process.env.AI_DAILY_TOKEN_LIMIT, 200_000),
      inputCostPerMillion: optionalNumber(
        process.env[`${providerPrefix}_INPUT_COST_PER_MILLION`] ??
          process.env.AI_INPUT_COST_PER_MILLION,
      ),
      outputCostPerMillion: optionalNumber(
        process.env[`${providerPrefix}_OUTPUT_COST_PER_MILLION`] ??
          process.env.AI_OUTPUT_COST_PER_MILLION,
      ),
    };
  },
  get near() {
    return {
      network: process.env.NEAR_NETWORK ?? "testnet",
      intentsApiUrl: (
        process.env.NEAR_INTENTS_API_URL ?? "https://1click.chaindefuser.com/v0"
      ).replace(/\/+$/, ""),
      intentsApiKey: process.env.NEAR_INTENTS_API_KEY ?? "",
      intentsAllowUnauthenticated:
        process.env.NEAR_INTENTS_ALLOW_UNAUTHENTICATED === "true",
      intentsTimeoutMs: positiveInt(process.env.NEAR_INTENTS_TIMEOUT_MS, 20_000),
      intentsSlippageBps: positiveInt(process.env.NEAR_INTENTS_SLIPPAGE_BPS, 100),
      intentsReferral: process.env.NEAR_INTENTS_REFERRAL ?? "",
      intentsRecipient:
        process.env.NEAR_INTENTS_RECIPIENT ?? process.env.NEAR_ACCOUNT_ID ?? "",
      intentsRefundTo:
        process.env.NEAR_INTENTS_REFUND_TO ?? process.env.NEAR_ACCOUNT_ID ?? "",
      intentsAssetMap: parseAssetMap(process.env.NEAR_INTENTS_ASSET_MAP),
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
      flutterwaveTestSecretKey: process.env.FLUTTERWAVE_TEST_SECRET_KEY ?? "",
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

/**
 * Parses `SYMBOL=assetId,SYMBOL=assetId` overrides for the 1Click token map.
 * Asset IDs contain colons, so split only on the first `=`.
 */
function parseAssetMap(value: string | undefined): Record<string, string> {
  if (!value) return {};
  const entries: Record<string, string> = {};
  for (const raw of value.split(",")) {
    const index = raw.indexOf("=");
    if (index <= 0) continue;
    const symbol = raw.slice(0, index).trim().toUpperCase();
    const assetId = raw.slice(index + 1).trim();
    if (symbol && assetId) entries[symbol] = assetId;
  }
  return entries;
}
