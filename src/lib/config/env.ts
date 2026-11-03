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
    return {
      apiKey: process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
      baseUrl: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
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

export const DEMO_MODE = process.env.DEMO_MODE !== "false";
export const DATA_MODE = process.env.DATA_MODE === "database" ? "database" : "demo";
