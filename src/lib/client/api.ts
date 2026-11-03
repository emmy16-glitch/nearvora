export interface ApiEnvelope<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

interface ApiErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });

  let payload: ApiEnvelope<T> | ApiErrorEnvelope | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || !payload.ok) {
    const errorPayload = payload && !payload.ok ? payload.error : null;
    throw new ApiClientError(
      response.status,
      errorPayload?.code ?? "REQUEST_FAILED",
      errorPayload?.message ?? `Request failed with status ${response.status}.`,
      errorPayload?.details,
    );
  }

  return payload.data;
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function issueMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Nothing was executed.";
}

export function errorIssues(error: unknown): { path: string; message: string }[] {
  if (!(error instanceof ApiClientError)) return [];
  const details = error.details as { issues?: { path: string; message: string }[] } | undefined;
  return details?.issues ?? [];
}
