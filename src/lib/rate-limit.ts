import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 100_000;

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitConfig
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    if (buckets.size >= MAX_BUCKETS) {
      sweepExpired(now);
    }
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }
  return { allowed: true, retryAfterMs: 0 };
}

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
  if (buckets.size >= MAX_BUCKETS) {
    const first = buckets.keys().next().value as string | undefined;
    if (first !== undefined) buckets.delete(first);
  }
}

export function getClientIp(request: NextRequest): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
