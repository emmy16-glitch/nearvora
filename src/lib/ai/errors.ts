import { APICallError } from "ai";

export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_AUTHENTICATION_FAILED"
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_INVALID_RESPONSE"
  | "AI_BUDGET_EXCEEDED"
  | "AI_REQUEST_FAILED";

const SAFE_MESSAGES: Record<AiErrorCode, string> = {
  AI_NOT_CONFIGURED:
    "Nearvora AI is not connected in this environment. The labelled development planner is active.",
  AI_AUTHENTICATION_FAILED:
    "Nearvora AI could not authenticate with its inference provider. Check the server configuration.",
  AI_RATE_LIMITED:
    "Nearvora AI is receiving too many requests right now. Please wait a moment and try again.",
  AI_TIMEOUT: "Nearvora AI took too long to respond. Nothing was executed. Please try again.",
  AI_PROVIDER_UNAVAILABLE:
    "Nearvora AI is temporarily unavailable. Nothing was executed. Please try again shortly.",
  AI_INVALID_RESPONSE:
    "Nearvora AI returned an unusable response. Nothing was executed. Please try again.",
  AI_BUDGET_EXCEEDED:
    "The development AI usage limit has been reached. Nearvora has paused model requests to avoid unexpected spending.",
  AI_REQUEST_FAILED: "Nearvora AI could not complete that request. Nothing was executed.",
};

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly retryable: boolean;
  readonly providerStatus?: number;

  constructor(
    code: AiErrorCode,
    options?: { retryable?: boolean; providerStatus?: number; cause?: unknown },
  ) {
    super(SAFE_MESSAGES[code]);
    this.name = "AiError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.providerStatus = options?.providerStatus;
    this.cause = options?.cause;
  }
}

export class AiNotConfiguredError extends AiError {
  constructor(message?: string) {
    super("AI_NOT_CONFIGURED", { retryable: false });
    this.name = "AiNotConfiguredError";
    if (message) this.message = message;
  }
}

export class AiBudgetExceededError extends AiError {
  constructor() {
    super("AI_BUDGET_EXCEEDED", { retryable: false });
    this.name = "AiBudgetExceededError";
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error.name === "AbortError" || error.name === "TimeoutError"))
  );
}

function messageIncludes(error: unknown, terms: string[]): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return terms.some((term) => message.includes(term));
}

/**
 * Converts provider/SDK failures into safe, user-facing errors. Provider response
 * bodies and request headers are deliberately never included in the message.
 */
export function normalizeAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;

  if (error instanceof APICallError) {
    const status = error.statusCode;
    if (status === 401 || status === 403) {
      return new AiError("AI_AUTHENTICATION_FAILED", {
        providerStatus: status,
        cause: error,
      });
    }
    if (status === 429) {
      return new AiError("AI_RATE_LIMITED", {
        retryable: true,
        providerStatus: status,
        cause: error,
      });
    }
    if (status === 408 || status === 504) {
      return new AiError("AI_TIMEOUT", {
        retryable: true,
        providerStatus: status,
        cause: error,
      });
    }
    if (status && status >= 500) {
      return new AiError("AI_PROVIDER_UNAVAILABLE", {
        retryable: true,
        providerStatus: status,
        cause: error,
      });
    }
    return new AiError("AI_REQUEST_FAILED", {
      retryable: Boolean(error.isRetryable),
      providerStatus: status,
      cause: error,
    });
  }

  if (isAbortError(error)) {
    return new AiError("AI_TIMEOUT", { retryable: true, cause: error });
  }

  if (messageIncludes(error, ["rate limit", "too many requests"])) {
    return new AiError("AI_RATE_LIMITED", { retryable: true, cause: error });
  }
  if (messageIncludes(error, ["timeout", "timed out", "etimedout"])) {
    return new AiError("AI_TIMEOUT", { retryable: true, cause: error });
  }
  if (messageIncludes(error, ["unauthorized", "forbidden", "invalid api key"])) {
    return new AiError("AI_AUTHENTICATION_FAILED", { cause: error });
  }
  if (messageIncludes(error, ["invalid response", "parse", "schema", "no object generated"])) {
    return new AiError("AI_INVALID_RESPONSE", { cause: error });
  }

  return new AiError("AI_REQUEST_FAILED", { cause: error });
}

/** Operational logging only. Never include prompts, conversations or credentials. */
export function logAiFailure(error: AiError, operation: string, durationMs?: number): void {
  console.warn("[nearvora] ai request failed", {
    operation,
    code: error.code,
    providerStatus: error.providerStatus ?? null,
    retryable: error.retryable,
    durationMs: durationMs ?? null,
  });
}
