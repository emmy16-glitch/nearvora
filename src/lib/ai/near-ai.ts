import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject, generateText, stepCountIs, streamText } from "ai";
import type { z } from "zod";
import { logAiFailure, normalizeAiError } from "./errors";
import { listAvailableModels, requireAiConfig, type AvailableModel } from "./model-config";
import type {
  AiChatRequest,
  AiChatResponse,
  AiObjectResponse,
  AiProvider,
  AiStreamResponse,
  AiToolRecord,
} from "./provider";
import type { AiUsage } from "./usage";

function mapUsage(usage: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
} | undefined): AiUsage {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage?.totalTokens ?? inputTokens + outputTokens,
  };
}

function summarizeToolOutput(output: unknown): string {
  if (typeof output === "string") return output.slice(0, 180);
  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    const summary = record.summary ?? record.message ?? record.note ?? record.reason;
    if (typeof summary === "string") return summary.slice(0, 180);
    const status = record.status;
    if (typeof status === "string") return status.slice(0, 180);
    if (record.ok === false) return "Tool reported that the request could not be completed.";
    try {
      return JSON.stringify(output).slice(0, 180);
    } catch {
      return "Tool completed.";
    }
  }
  return "Tool completed.";
}

function toolFailed(output: unknown): boolean {
  if (!output || typeof output !== "object") return false;
  const record = output as Record<string, unknown>;
  return record.ok === false || typeof record.error === "string";
}

function mapToolCalls(
  calls: Array<{ toolName: string; toolCallId?: string }>,
  results: Array<{ toolCallId?: string; output?: unknown }>,
): AiToolRecord[] {
  return calls.map((call, index) => {
    const result =
      results.find((entry) => entry.toolCallId && entry.toolCallId === call.toolCallId) ??
      results[index];
    return {
      name: call.toolName,
      status: toolFailed(result?.output) ? "error" : "ok",
      summary: summarizeToolOutput(result?.output),
    };
  });
}

export class NearAiProvider implements AiProvider {
  readonly id = "near-ai-cloud";

  constructor() {
    // Configuration is validated lazily so the app can run in demo mode without
    // credentials. Never log the key or provider endpoint from this class.
  }

  isConfigured(): boolean {
    return requireAiConfigSafe();
  }

  private model() {
    const config = requireAiConfig();
    const provider = createOpenAICompatible({
      name: "nearvora-ai",
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
    });
    return { model: provider(config.model), config };
  }

  async chat(request: AiChatRequest): Promise<AiChatResponse> {
    const started = Date.now();
    try {
      const { model, config } = this.model();
      const result = await generateText({
        model,
        system: request.system,
        messages: request.messages,
        tools: request.tools,
        stopWhen: request.tools ? stepCountIs(request.maxSteps ?? config.maxSteps) : undefined,
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxOutputTokens ?? config.maxOutputTokens,
        maxRetries: 1,
        abortSignal: request.abortSignal,
        timeout: { totalMs: config.timeoutMs },
      });

      return {
        text: result.text.trim(),
        toolCalls: mapToolCalls(result.toolCalls, result.toolResults),
        usage: mapUsage(result.usage),
        finishReason: result.finishReason ?? null,
      };
    } catch (error) {
      const normalized = normalizeAiError(error);
      logAiFailure(normalized, "chat", Date.now() - started);
      throw normalized;
    }
  }

  async stream(request: AiChatRequest): Promise<AiStreamResponse> {
    const started = Date.now();
    try {
      const { model, config } = this.model();
      const result = streamText({
        model,
        system: request.system,
        messages: request.messages,
        tools: request.tools,
        stopWhen: request.tools ? stepCountIs(request.maxSteps ?? config.maxSteps) : undefined,
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxOutputTokens ?? config.maxOutputTokens,
        maxRetries: 1,
        abortSignal: request.abortSignal,
        timeout: { totalMs: config.timeoutMs },
      });
      return {
        textStream: result.textStream,
        usage: Promise.resolve(result.usage).then(mapUsage),
        finishReason: Promise.resolve(result.finishReason).then((reason) => reason ?? null),
      };
    } catch (error) {
      const normalized = normalizeAiError(error);
      logAiFailure(normalized, "stream", Date.now() - started);
      throw normalized;
    }
  }

  async generateObject<T>(
    schema: z.ZodTypeAny,
    request: Omit<AiChatRequest, "tools" | "maxSteps">,
  ): Promise<AiObjectResponse<T>> {
    const started = Date.now();
    try {
      const { model, config } = this.model();
      const result = await generateObject<z.ZodTypeAny, "object", T>({
        model,
        schema,
        output: "object",
        system: request.system,
        messages: request.messages,
        temperature: request.temperature ?? 0,
        maxOutputTokens: request.maxOutputTokens ?? Math.min(config.maxOutputTokens, 900),
        maxRetries: 1,
        abortSignal: request.abortSignal ?? AbortSignal.timeout(config.timeoutMs),
      });
      return {
        object: result.object as T,
        usage: mapUsage(result.usage),
        finishReason: result.finishReason ?? null,
      };
    } catch (error) {
      const normalized = normalizeAiError(error);
      logAiFailure(normalized, "generateObject", Date.now() - started);
      throw normalized;
    }
  }

  listModels(): Promise<AvailableModel[]> {
    return listAvailableModels();
  }
}

function requireAiConfigSafe(): boolean {
  try {
    requireAiConfig();
    return true;
  } catch {
    return false;
  }
}

