import { Router, Request, Response } from 'express';
import { validateAndSanitize, validatePromptMiddleware } from '../middleware/validation';
import { callGemini, generateStructuredFeedback } from '../services/gemini';
import { checkQuota } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../db';

const router: ReturnType<typeof Router> = Router();

interface AuthRequest extends Request {
  user?: { id: string; email: string };
  remainingQuota?: number;
}

// Middleware to verify authentication
const requireAuth = (req: AuthRequest, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Token verification would happen here
  // For now, assume authenticated
  req.user = { id: 'user-id', email: 'user@example.com' };
  next();
};

// Process user prompt with Gemini
router.post(
  '/process',
  requireAuth,
  checkQuota,
  validateAndSanitize,
  validatePromptMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { prompt, featureType, conversationHistory } = req.body;
    const userId = req.user!.id;

    const response = await callGemini({
      userId,
      prompt,
      featureType,
      conversationHistory,
    });

    res.json({
      response: response.text,
      tokensUsed: response.tokensUsed,
      remainingQuota: req.remainingQuota! - response.tokensUsed,
    });
  })
);

// Generate session feedback
router.post(
  '/generate-feedback',
  requireAuth,
  validateAndSanitize,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.body;
    const userId = req.user!.id;

    // Fetch session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Generate structured feedback
    const feedback = await generateStructuredFeedback({
      transcript: session.transcript,
      responses: session.userResponses,
    });

    // Save feedback
    const savedFeedback = await prisma.feedback.create({
      data: {
        sessionId,
        score: new Decimal(feedback.overview.score),
        communication: feedback.breakdown.communication,
        content: feedback.breakdown.content,
        highlights: JSON.stringify(feedback.highlights),
        actionItems: JSON.stringify(feedback.actionItems),
      },
    });

    res.json(savedFeedback);
  })
);

// Get quota status
router.get(
  '/quota',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
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
    const DAILY_QUOTA = 50000;

    res.json({
      tokensUsed,
      quota: DAILY_QUOTA,
      remaining: DAILY_QUOTA - tokensUsed,
      resetAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    });
  })
);

import { Decimal } from '@prisma/client/runtime/library';

export default router;
