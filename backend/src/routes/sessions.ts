import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../db';

const router: ReturnType<typeof Router> = Router();

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

const requireAuth = (req: AuthRequest, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.split(' ')[1]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = { id: 'user-id', email: 'user@example.com' };
  next();
};

// Create session
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { featureType, title, description } = req.body;
    const userId = req.user!.id;

    const session = await prisma.session.create({
      data: {
        userId,
        featureType,
        title,
        description,
        durationSeconds: 0,
      },
    });

    res.status(201).json(session);
  })
);

// Update session
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { durationSeconds, score, transcript, feedbackJson, clarity, pace, confidence, tone } = req.body;

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updated = await prisma.session.update({
      where: { id },
      data: {
        durationSeconds: durationSeconds ?? session.durationSeconds,
        score: score ?? session.score,
        transcript: transcript ?? session.transcript,
        feedbackJson: feedbackJson ?? session.feedbackJson,
        clarity: clarity ?? session.clarity,
        pace: pace ?? session.pace,
        confidence: confidence ?? session.confidence,
        tone: tone ?? session.tone,
      },
    });

    res.json(updated);
  })
);

// Get user sessions
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { limit = 20, offset = 0, featureType } = req.query;

    const sessions = await prisma.session.findMany({
      where: {
        userId,
        ...(featureType && { featureType: featureType as string }),
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.session.count({
      where: {
        userId,
        ...(featureType && { featureType: featureType as string }),
      },
    });

    res.json({
      sessions,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  })
);

// Get session details
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  })
);

export default router;
