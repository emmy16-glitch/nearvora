import type { ModelMessage, ToolSet } from "ai";
import type { z } from "zod";
import type { AiUsage } from "./usage";
import { env } from "@/lib/config/env";
import { isAiConfigured, requireAiConfig, type AvailableModel } from "./model-config";
import { OpenAiCompatibleProvider } from "./openai-compatible";

export interface AiChatRequest {
  system: string;
  messages: ModelMessage[];
  tools?: ToolSet;
  temperature?: number;
  maxOutputTokens?: number;
  maxSteps?: number;
  abortSignal?: AbortSignal;
}

export interface AiToolRecord {
  name: string;
  status: "ok" | "error";
  summary: string;
}

export interface AiChatResponse {
  text: string;
  toolCalls: AiToolRecord[];
  usage: AiUsage;
  finishReason: string | null;
}

export interface AiObjectResponse<T> {
  object: T;
  usage: AiUsage;
  finishReason: string | null;
}

export interface AiStreamResponse {
  textStream: AsyncIterable<string>;
  usage: Promise<AiUsage>;
  finishReason: Promise<string | null>;
}

export interface AiProvider {
  readonly id: string;
  isConfigured(): boolean;
  chat(request: AiChatRequest): Promise<AiChatResponse>;
  stream(request: AiChatRequest): Promise<AiStreamResponse>;
  generateObject<T>(
    schema: z.ZodTypeAny,
    request: Omit<AiChatRequest, "tools" | "maxSteps">,
  ): Promise<AiObjectResponse<T>>;
  listModels(): Promise<AvailableModel[]>;
}

let provider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (!provider) {
    provider = new OpenAiCompatibleProvider();
  }
  return provider;
}

export function getAiProviderStatus() {
  const configured = isAiConfigured();
  return {
    assistant: "Nearvora AI",
    configured,
    mode: env.mode,
    planner: configured ? ("model" as const) : ("deterministic-development-planner" as const),
    note: configured
      ? "Nearvora AI is available. Financial data and execution remain enforced by the Nearvora backend."
      : "Nearvora AI is not connected. Requests use the labelled deterministic development planner.",
  };
}

export { requireAiConfig, isAiConfigured };
export type { AvailableModel };
