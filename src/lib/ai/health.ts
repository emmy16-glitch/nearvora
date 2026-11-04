import { env, type AiProviderId } from "@/lib/config/env";
import { getAiProvider } from "./provider";
import { isAiConfigured, listAvailableModels } from "./model-config";
import { normalizeAiError, type AiErrorCode } from "./errors";
import {
  assertUsageAllowed,
  getUsageSnapshot,
  recordUsage,
  type UsageSnapshot,
} from "./usage";

export type AiHealthStatus = "ok" | "unverified" | "degraded" | "not_configured";

export interface AiHealthReport {
  assistant: "Nearvora AI";
  status: AiHealthStatus;
  configured: boolean;
  mode: "demo" | "live";
  provider: AiProviderId;
  modelConfigured: boolean;
  modelAvailable: boolean | null;
  credentialVerified: boolean | null;
  chatProbe: "ok" | "failed" | "skipped";
  latencyMs: number | null;
  errorCode?: AiErrorCode;
  usage: UsageSnapshot | null;
  note: string;
}

const HEALTH_USER = "system:ai-health";

/**
 * Verifies server-side AI provider configuration without exposing the API key.
 * Model discovery may not validate billing or chat support, so credentials and
 * inference are only confirmed by an opt-in live chat probe.
 */
export async function checkAiHealth(
  options: { probe?: boolean; userId?: string } = {},
): Promise<AiHealthReport> {
  const started = Date.now();
  const configured = isAiConfigured();
  const base = {
    assistant: "Nearvora AI" as const,
    configured,
    mode: env.mode,
    provider: env.ai.provider,
    modelConfigured: Boolean(env.ai.model),
    usage: null,
  };

  if (!configured) {
    return {
      ...base,
      status: "not_configured",
      modelAvailable: null,
      credentialVerified: null,
      chatProbe: "skipped",
      latencyMs: null,
      note:
        "Nearvora AI is not configured. Set the selected provider credential and model on the server. No request was sent to the provider.",
    };
  }

  let models;
  try {
    models = await listAvailableModels();
  } catch (error) {
    const normalized = normalizeAiError(error);
    return {
      ...base,
      status: "degraded",
      modelAvailable: null,
      credentialVerified: null,
      chatProbe: "skipped",
      latencyMs: Date.now() - started,
      errorCode: normalized.code,
      note: "Nearvora AI configuration exists, but the provider model list could not be verified.",
    };
  }

  const modelAvailable = models.some((model) => model.id === env.ai.model);
  if (!modelAvailable) {
    return {
      ...base,
      status: "degraded",
      modelAvailable: false,
      credentialVerified: null,
      chatProbe: "skipped",
      latencyMs: Date.now() - started,
      errorCode: "AI_REQUEST_FAILED",
      note:
        "The selected Nearvora AI model was not returned by the provider. Choose an available model before enabling Nearvora AI.",
    };
  }

  if (!options.probe) {
    return {
      ...base,
      status: "unverified",
      modelAvailable: true,
      credentialVerified: null,
      chatProbe: "skipped",
      latencyMs: Date.now() - started,
      note:
        "Nearvora AI is configured and the selected model is available. Use ?probe=1 with an authenticated session to verify credentials with a live completion.",
    };
  }

  const userId = options.userId ?? HEALTH_USER;
  try {
    assertUsageAllowed(userId);
    const result = await getAiProvider().chat({
      system: "You are a health-check endpoint. Reply with the single word OK.",
      messages: [{ role: "user", content: "Reply with OK." }],
      temperature: 0,
      maxOutputTokens: 128,
    });
    const usage = recordUsage(userId, result.usage);
    return {
      ...base,
      status: "ok",
      modelAvailable: true,
      credentialVerified: true,
      chatProbe: "ok",
      latencyMs: Date.now() - started,
      usage,
      note: "Nearvora AI is configured, the selected model is available and a live chat completion succeeded.",
    };
  } catch (error) {
    const normalized = normalizeAiError(error);
    return {
      ...base,
      status: "degraded",
      modelAvailable: true,
      credentialVerified: false,
      chatProbe: "failed",
      latencyMs: Date.now() - started,
      errorCode: normalized.code,
      usage: getUsageSnapshot(userId),
      note:
        "Nearvora AI is configured and the model exists, but the live chat probe failed. No financial operation was attempted.",
    };
  }
}
