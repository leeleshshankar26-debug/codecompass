import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { Request, Response, NextFunction } from 'express';

let redis: Redis | null = null;
let aiRatelimit: Ratelimit | null = null;
let executeRatelimit: Ratelimit | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

function getAiRatelimit(): Ratelimit {
  if (!aiRatelimit) {
    aiRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 AI requests per minute per user
      prefix: 'cc:ai:',
      analytics: false,
    });
  }
  return aiRatelimit;
}

function getExecuteRatelimit(): Ratelimit {
  if (!executeRatelimit) {
    executeRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 executions per minute per user
      prefix: 'cc:exec:',
      analytics: false,
    });
  }
  return executeRatelimit;
}

/**
 * Rate limit middleware factory.
 * Requires req.userId to be set by the auth middleware first.
 */
export function rateLimitMiddleware(type: 'ai' | 'execute') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as Request & { userId?: string }).userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const limiter = type === 'ai' ? getAiRatelimit() : getExecuteRatelimit();
      const { success, limit, remaining, reset } = await limiter.limit(userId);

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', reset);

      if (!success) {
        res.status(429).json({
          error: 'Rate limit exceeded. Please wait before making more requests.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        });
        return;
      }
      next();
    } catch (err) {
      // If Redis is down, fail open to avoid blocking all users
      console.error('[RateLimit] Redis error, failing open:', err instanceof Error ? err.message : err);
      next();
    }
  };
}
