import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { env } from "@/lib/config/env";
import { AiError, type AiErrorCode } from "@/lib/ai/errors";
import { getSession, type Session } from "@/lib/security/session";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function ok<T>(data: T, meta?: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data, meta }, init);
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code, message, details } },
    { status },
  );
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, "UNAUTHENTICATED", "Your demo session has expired. Reload the page.");
  }
  return session;
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(422, "VALIDATION_ERROR", "Some fields need attention.", {
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    throw error;
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("host");
  try {
    if (!host || new URL(origin).host !== host) {
      throw new ApiError(403, "INVALID_ORIGIN", "This request did not originate from Nearvora.");
    }
  } catch {
    throw new ApiError(403, "INVALID_ORIGIN", "This request did not originate from Nearvora.");
  }
}

export function assertDemoWrite(): void {
  if (!env.demoMode) {
    throw new ApiError(
      503,
      "LIVE_EXECUTION_DISABLED",
      "Live provider execution is not configured. Nearvora is running without live money movement.",
    );
  }
}

const AI_ERROR_STATUS: Record<AiErrorCode, number> = {
  AI_NOT_CONFIGURED: 503,
  AI_AUTHENTICATION_FAILED: 502,
  AI_RATE_LIMITED: 429,
  AI_TIMEOUT: 504,
  AI_PROVIDER_UNAVAILABLE: 503,
  AI_INVALID_RESPONSE: 502,
  AI_BUDGET_EXCEEDED: 429,
  AI_REQUEST_FAILED: 502,
};

export function handleRoute(handler: () => Promise<Response>): Promise<Response> {
  return handler().catch((error: unknown) => {
    if (error instanceof ApiError) {
      return fail(error.status, error.code, error.message, error.details);
    }
    if (error instanceof AiError) {
      return fail(AI_ERROR_STATUS[error.code] ?? 502, error.code, error.message);
    }
    if (error instanceof ZodError) {
      return fail(422, "VALIDATION_ERROR", "Some fields need attention.", {
        issues: error.issues,
      });
    }
    console.error("[nearvora] unhandled route error", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Something went wrong on our side. Nothing was executed.";
    return fail(500, "INTERNAL_ERROR", message);
  });
}
