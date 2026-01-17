/**
 * Rate Limiter Utility
 * Simple in-memory rate limiting for Cloud Functions
 * Note: For production, consider using Redis or Firebase App Check
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration per function
 */
export const RATE_LIMITS = {
  ANALYZE_DESIGN: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  CHAT_WITH_MENTOR: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  SEARCH_SIMILAR: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  SEARCH_TEXT: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  CUSTOM_SEARCH: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  SAVE_ITEM: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  GET_ANALYSES: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 requests per minute
  GET_BOOKMARKS: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 requests per minute
  DELETE_BOOKMARK: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  DEFAULT: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
} as const;

/**
 * Check if request is within rate limit
 * @param userId - User ID
 * @param functionName - Function name
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  userId: string,
  functionName: keyof typeof RATE_LIMITS
): boolean {
  const limit = RATE_LIMITS[functionName] || RATE_LIMITS.DEFAULT;
  const key = `${userId}:${functionName}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs,
    });
    return true;
  }

  if (entry.count >= limit.maxRequests) {
    return false; // Rate limited
  }

  // Increment count
  entry.count++;
  return true;
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}


