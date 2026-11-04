import { env } from "@/lib/config/env";
import { AiError, AiNotConfiguredError, normalizeAiError } from "./errors";

export interface AiModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
  maxSteps: number;
}

export interface AvailableModel {
  id: string;
  ownedBy?: string;
}

const MODEL_CACHE_MS = 5 * 60 * 1000;
let modelCache: { expiresAt: number; models: AvailableModel[] } | null = null;

export function isAiConfigured(): boolean {
  return Boolean(env.ai.apiKey && env.ai.model);
}

/** Validates the server-side configuration lazily, only when AI is actually used. */
export function requireAiConfig(): AiModelConfig {
  if (!env.ai.apiKey) {
    throw new AiNotConfiguredError(
      "NEAR_AI_KEY is not configured. Nearvora AI will use the labelled development planner.",
    );
  }
  if (!env.ai.model) {
    throw new AiNotConfiguredError(
      "NEAR_AI_MODEL is not configured. Nearvora AI will use the labelled development planner.",
    );
  }
  return {
    apiKey: env.ai.apiKey,
    baseUrl: env.ai.baseUrl,
    model: env.ai.model,
    timeoutMs: env.ai.timeoutMs,
    maxOutputTokens: env.ai.maxOutputTokens,
    maxSteps: env.ai.maxSteps,
  };
}

/**
 * Lists models exposed by the configured OpenAI-compatible provider. This is an
 * operational helper; model identifiers are never returned to customer-facing UI.
 */
export async function listAvailableModels(): Promise<AvailableModel[]> {
  if (modelCache && modelCache.expiresAt > Date.now()) return modelCache.models;
  const config = requireAiConfig();

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(Math.min(config.timeoutMs, 15_000)),
      cache: "no-store",
    });
  } catch (error) {
    throw normalizeAiError(error);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new AiError("AI_AUTHENTICATION_FAILED", { providerStatus: response.status });
    }
    if (response.status === 429) {
      throw new AiError("AI_RATE_LIMITED", {
        retryable: true,
        providerStatus: response.status,
      });
    }
    throw new AiError("AI_PROVIDER_UNAVAILABLE", {
      retryable: response.status >= 500,
      providerStatus: response.status,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new AiError("AI_INVALID_RESPONSE", { cause: error });
  }

  const data =
    typeof payload === "object" && payload !== null && "data" in payload
      ? (payload as { data?: unknown }).data
      : payload;
  if (!Array.isArray(data)) {
    throw new AiError("AI_INVALID_RESPONSE");
  }

  const models = data
    .map((entry): AvailableModel | null => {
      if (!entry || typeof entry !== "object" || !("id" in entry)) return null;
      const id = (entry as { id?: unknown }).id;
      if (typeof id !== "string" || !id.trim()) return null;
      const ownedBy = (entry as { owned_by?: unknown }).owned_by;
      return {
        id: id.trim(),
        ownedBy: typeof ownedBy === "string" ? ownedBy : undefined,
      };
    })
    .filter((entry): entry is AvailableModel => entry !== null);

  modelCache = { expiresAt: Date.now() + MODEL_CACHE_MS, models };
  return models;
}

export function clearModelCacheForTests(): void {
  modelCache = null;
}
