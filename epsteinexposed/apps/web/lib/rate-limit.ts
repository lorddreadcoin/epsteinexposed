/**
 * Simple in-memory rate limiter for API protection
 * Works with Netlify Edge Functions and serverless
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (resets on cold start, but that's fine for basic protection)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Window size in milliseconds
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP, API key, etc.)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  // Create new entry if doesn't exist or window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count <= config.maxRequests;
  
  return {
    success,
    remaining,
    resetTime: entry.resetTime,
    retryAfter: success ? undefined : Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Pre-configured rate limits for different endpoint types
 */
export const RATE_LIMITS = {
  // AI/Chat endpoints - expensive, strict limits
  ai: { maxRequests: 20, windowMs: 60 * 1000 },      // 20 req/min
  
  // Search endpoints - moderate limits
  search: { maxRequests: 60, windowMs: 60 * 1000 },  // 60 req/min
  
  // Graph data - can be cached, more lenient
  graph: { maxRequests: 30, windowMs: 60 * 1000 },   // 30 req/min
  
  // Document endpoints - moderate
  documents: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 req/min
  
  // General API - default
  default: { maxRequests: 120, windowMs: 60 * 1000 },   // 120 req/min
};

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
    ...(result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : {}),
  };
}
