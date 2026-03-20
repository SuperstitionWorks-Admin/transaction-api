/**
 * NOTE: This rate limiter is in-process and stateless across instances.
 *
 * On serverless runtimes (Vercel, AWS Lambda) each cold start resets all
 * windows, so the effective limit is per-instance rather than per-key
 * globally. This is acceptable for development and low-traffic production,
 * but for hard enforcement you should replace this with a Redis-backed
 * limiter such as Upstash Ratelimit (@upstash/ratelimit).
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private records: Map<string, RateLimitRecord>;
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 60, windowMs: number = 60000) {
    this.records = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(identifier: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = this.records.get(identifier);

    if (!record || now > record.resetTime) {
      this.records.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (record.count >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    record.count += 1;
    return { allowed: true, remaining: this.maxRequests - record.count };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records) {
      if (now > record.resetTime) {
        this.records.delete(key);
      }
    }
  }
}

const rateLimiter = new InMemoryRateLimiter(60, 60000);

// Keep a reference so tests can stop the interval and avoid open handle warnings.
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => rateLimiter.cleanup(), 60000);
}

export function stopCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Auto-start everywhere except test environments.
if (process.env.NODE_ENV !== 'test') {
  startCleanup();
}

export async function checkRateLimit(apiKeyId: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  return rateLimiter.check(apiKeyId);
}
