import type { Context, Next } from 'hono';

/**
 * Simple in-memory rate limiter for Hono
 */
class SimpleRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();

  constructor(private windowMs: number, private maxRequests: number) {
    // Cleanup expired entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.store.entries()) {
        if (now > data.resetTime) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  isAllowed(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now > existing.resetTime) {
      // New window
      const resetTime = now + this.windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime };
    }

    if (existing.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: existing.resetTime };
    }

    existing.count++;
    return { allowed: true, remaining: this.maxRequests - existing.count, resetTime: existing.resetTime };
  }

  getClientKey(c: Context): string {
    // Get client IP from headers
    const xForwardedFor = c.req.header('x-forwarded-for');
    const xRealIp = c.req.header('x-real-ip');
    const cfConnectingIp = c.req.header('cf-connecting-ip');
    const xClientIp = c.req.header('x-client-ip');

    const ip = xForwardedFor ||
              xRealIp ||
              cfConnectingIp ||
              xClientIp ||
              'unknown';

    // Debug logging
    console.log('🔍 Rate Limiter IP Detection:', {
      'x-forwarded-for': xForwardedFor,
      'x-real-ip': xRealIp,
      'cf-connecting-ip': cfConnectingIp,
      'x-client-ip': xClientIp,
      'detected-ip': ip,
      'path': c.req.path
    });

    // For forwarded IPs, take the first one (original client)
    return ip ? ip.split(',')[0].trim() : 'unknown';
  }
}

// Create rate limiter instances
const evaluationRateLimiter = new SimpleRateLimiter(60 * 60 * 1000, 3); // 3 per hour
const generalApiRateLimiter = new SimpleRateLimiter(60 * 1000, 60); // 60 per minute

/**
 * Create a rate limiting middleware
 */
export function createRateLimiter(limiter: SimpleRateLimiter, options: {
  skipPaths?: string[];
  generateResponse?: (c: Context, result: { allowed: boolean; remaining: number; resetTime: number }) => Response | void;
}) {
  return async (c: Context, next: Next) => {
    // Check if this path should be skipped
    if (options.skipPaths) {
      const path = c.req.path;
      for (const skipPath of options.skipPaths) {
        if (path.startsWith(skipPath)) {
          return await next();
        }
      }
    }

    const clientKey = limiter.getClientKey(c);
    const result = limiter.isAllowed(clientKey);

    // Add rate limit headers
    c.header('X-RateLimit-Limit', limiter['maxRequests'].toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', result.resetTime.toString());

    if (!result.allowed) {
      // Custom response or default
      if (options.generateResponse) {
        const customResponse = options.generateResponse(c, result);
        if (customResponse) {
          return customResponse;
        }
      }

      return c.json({
        error: 'Too many requests',
        details: limiter === evaluationRateLimiter
          ? 'You have exceeded the limit of 3 evaluation tests per hour. Please try again later.'
          : 'Rate limit exceeded. Please slow down your requests.',
        retryAfter: limiter === evaluationRateLimiter ? '1 hour' : '1 minute',
        status: 'error',
        remaining: 0,
        resetTime: new Date(result.resetTime).toISOString()
      }, 429);
    }

    await next();
  };
}

/**
 * Rate limiter for evaluation endpoints - 3 evaluations per hour per IP
 */
export const evaluationLimiterMiddleware = createRateLimiter(evaluationRateLimiter, {
  skipPaths: ['/health', '/auth/sign-up', '/auth/sign-in', '/auth/sign-out', '/auth/me', '/upload', '/jobs', '/api-spec', '/swagger', '/'],
  generateResponse: (c, result) => {
    console.warn(`Rate limit exceeded for evaluation from IP: ${evaluationRateLimiter.getClientKey(c)}`);

    return c.json({
      error: 'Too many evaluation requests',
      details: 'You have exceeded the limit of 3 evaluation tests per hour. Please try again later.',
      retryAfter: '1 hour',
      status: 'error',
      remaining: 0,
      resetTime: new Date(result.resetTime).toISOString()
    }, 429);
  }
});

/**
 * General API rate limiter - 60 requests per minute per IP
 */
export const generalApiLimiterMiddleware = createRateLimiter(generalApiRateLimiter, {
  skipPaths: ['/health', '/api-spec', '/swagger'],
  generateResponse: (c, result) => {
    console.warn(`Rate limit exceeded for general API from IP: ${generalApiRateLimiter.getClientKey(c)}`);

    return c.json({
      error: 'Too many requests',
      details: 'Rate limit exceeded. Please slow down your requests.',
      retryAfter: '1 minute',
      status: 'error',
      remaining: 0,
      resetTime: new Date(result.resetTime).toISOString()
    }, 429);
  }
});

// Export for backward compatibility
export const evaluationLimiter = evaluationLimiterMiddleware;
export const generalApiLimiter = generalApiLimiterMiddleware;