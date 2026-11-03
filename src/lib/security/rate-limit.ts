interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_BUCKETS = 5_000;

/**
 * Simple in-memory token bucket. Replace with Redis/Upstash for multi-instance
 * production deployments.
 */
export function rateLimit(
  key: string,
  limit = 30,
  windowMs = WINDOW_MS,
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) buckets.clear();
  const refillRate = limit / windowMs;
  const existing = buckets.get(key);
  const bucket: Bucket = existing ?? { tokens: limit, updatedAt: now };
  const elapsed = now - bucket.updatedAt;
  bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillRate);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((1 - bucket.tokens) / refillRate / 1000),
    };
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.floor(bucket.tokens),
    retryAfterSeconds: 0,
  };
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}
