/**
 * Simple in-memory rate limiter for auth endpoints.
 * Keyed by IP address (or any string identifier).
 *
 * NOTE: In a multi-instance deployment, pair this with a shared store
 * (e.g. Redis). For single-instance use it works well as-is.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

/** Clean up expired entries periodically to avoid unbounded memory growth. */
function evict() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

// Evict every 10 minutes; only register in non-test environments to avoid
// test-runner interference. The interval ID is intentionally not exported —
// production code never needs to cancel it, and tests don't load this module
// in a way that would leak the timer.
/* istanbul ignore next */
if (typeof setInterval !== "undefined" && process.env.NODE_ENV !== "test") {
  setInterval(evict, 10 * 60 * 1000);
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed per window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** How many requests remain in the current window (0 when blocked). */
  remaining: number;
  /** Seconds until the window resets (only meaningful when blocked). */
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const { maxRequests, windowMs } = options;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count, retryAfterSeconds: 0 };
}
