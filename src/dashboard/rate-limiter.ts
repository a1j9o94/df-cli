/**
 * In-memory per-IP rate limiter.
 * Returns 429 with { error: "Too many requests" } when limit exceeded.
 * Rate limiting runs before route handling.
 */

export interface RateLimitConfig {
  /** Maximum requests per window (default: 100) */
  maxRequests: number;
  /** Window size in milliseconds (default: 60000 = 60 seconds) */
  windowMs: number;
}

interface RequestRecord {
  timestamps: number[];
}

export class RateLimiter {
  private records: Map<string, RequestRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxRequests: config?.maxRequests ?? 100,
      windowMs: config?.windowMs ?? 60_000,
    };
  }

  /**
   * Check if a request from the given IP should be allowed.
   * Returns true if allowed, false if rate limited.
   */
  isAllowed(ip: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let record = this.records.get(ip);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(ip, record);
    }

    // Remove timestamps outside the window
    record.timestamps = record.timestamps.filter((t) => t > windowStart);

    if (record.timestamps.length >= this.config.maxRequests) {
      return false;
    }

    record.timestamps.push(now);
    return true;
  }

  /**
   * Extract client IP from request, using X-Forwarded-For if present.
   */
  static extractIp(req: Request, server?: { requestIP?: (req: Request) => { address: string } | null }): string {
    const forwarded = req.headers.get("X-Forwarded-For");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    if (server?.requestIP) {
      const info = server.requestIP(req);
      if (info) return info.address;
    }
    return "127.0.0.1";
  }
}
