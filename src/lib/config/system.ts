import { env } from "@/lib/config/env";
import { isAiConfigured } from "@/lib/ai/model-config";
import { getOutLayerAdapter } from "@/lib/services/outlayer";
import { getNearIntentsAdapter } from "@/lib/services/intents";
import { getPaymentProvider } from "@/lib/services/payments";

export function systemStatus() {
  const aiConfigured = isAiConfigured();
  const outlayer = getOutLayerAdapter();
  const intents = getNearIntentsAdapter();
  const payments = getPaymentProvider();
  return {
    mode: env.mode,
    demoMode: env.demoMode,
    liveReady: false,
    persistence: "in-memory" as const,
    dataMode: env.dataMode,
    databaseConfigured: Boolean(env.databaseUrl),
    ai: {
      assistant: "Nearvora AI",
      configured: aiConfigured,
      planner: aiConfigured ? "model" : "deterministic-development-planner",
      note: aiConfigured
        ? "Nearvora AI is connected. Financial data and execution still come from the Nearvora backend."
        : "Nearvora AI is not connected. The labelled development planner is active.",
    },
    near: {
      network: env.near.network,
      intentsConfigured: intents.isConfigured(),
      outlayerMode: outlayer.mode,
      liveExecution: false,
      note: intents.isConfigured()
        ? "1Click quoting and status tracking are configured. Live settlement and custody remain disabled in this build."
        : "NEAR Intents and OutLayer live execution are not configured in this build.",
    },
    payments: {
      provider: payments.name,
      mode: payments.mode,
      note: "All Naira settlements are simulated unless approved live credentials are configured and live mode is enabled.",
    },
    accounting: {
      formanceConfigured: Boolean(env.formance.url && env.formance.token),
      note: "Formance adapter is scaffolded; the demo ledger is used until configured.",
    },
    liveRuntimeNote:
      env.demoMode
        ? null
        : "LIVE mode is not available in this build. The in-memory demo store and provider adapters refuse to serve or execute data in LIVE mode.",
    simulated: env.demoMode,
  };
}

export type SystemStatus = ReturnType<typeof systemStatus>;
