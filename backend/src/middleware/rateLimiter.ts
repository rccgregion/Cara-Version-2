import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db';

// Global rate limiter: 100 requests per 15 minutes per IP
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
});

// API rate limiter: 20 requests per minute per user
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: 'API rate limit exceeded.',
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
});

// Quota enforcement middleware
export const checkQuota = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.quotaUsage.aggregate({
      where: {
        userId,
        createdAt: { gte: today },
      },
      _sum: { tokensUsed: true },
    });

    const tokensUsed = usage._sum.tokensUsed || 0;
    const DAILY_QUOTA = 50000; // tokens per day

    if (tokensUsed >= DAILY_QUOTA) {
      return res.status(429).json({
        error: 'Daily quota exceeded',
        quotaReset: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Attach remaining quota to request
    req.remainingQuota = DAILY_QUOTA - tokensUsed;
    next();
  } catch (error) {
    next(error);
  }
};

declare global {
  namespace Express {
    interface Request {
      remainingQuota?: number;
      user?: { id: string; email: string };
    }
  }
}
