import { env } from "@/lib/config/env";
import { getOutLayerAdapter } from "@/lib/services/outlayer";
import { getNearIntentsAdapter } from "@/lib/services/intents";
import { getPaymentProvider } from "@/lib/services/payments";

export function systemStatus() {
  const aiConfigured = Boolean(env.ai.apiKey);
  const outlayer = getOutLayerAdapter();
  const intents = getNearIntentsAdapter();
  const payments = getPaymentProvider();
  return {
    demoMode: env.demoMode,
    dataMode: "demo" as const,
    databaseConfigured: Boolean(env.databaseUrl),
    ai: {
      configured: aiConfigured,
      provider: "openai-compatible",
      model: aiConfigured ? env.ai.model : null,
      planner: aiConfigured ? "model" : "deterministic-development-planner",
      note: aiConfigured
        ? "Model configured. Financial data and execution still come from the backend."
        : "No AI model is connected. The labelled development planner is active.",
    },
    near: {
      network: env.near.network,
      intentsConfigured: intents.isConfigured(),
      outlayerMode: outlayer.mode,
      liveExecution: false,
      note: "NEAR Intents and OutLayer live execution are not configured in this build.",
    },
    payments: {
      provider: payments.name,
      mode: payments.mode,
      note: "All Naira settlements are simulated unless approved live credentials are configured.",
    },
    accounting: {
      formanceConfigured: Boolean(env.formance.url && env.formance.token),
      note: "Formance adapter is scaffolded; the demo ledger is used until configured.",
    },
    simulated: true,
  };
}

export type SystemStatus = ReturnType<typeof systemStatus>;
