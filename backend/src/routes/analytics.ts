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

// Track event
router.post(
  '/events',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventType, metadata } = req.body;
    const userId = req.user!.id;

    const event = await prisma.analyticsEvent.create({
      data: {
        userId,
        eventType,
        metadata,
      },
    });

    res.status(201).json(event);
  })
);

// Get user stats
router.get(
  '/stats',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const [totalSessions, completedSessions, avgScore] = await Promise.all([
      prisma.session.count({ where: { userId } }),
      prisma.session.count({ where: { userId, completed: true } }),
      prisma.session.aggregate({
        where: { userId },
        _avg: { score: true },
      }),
    ]);

    res.json({
      totalSessions,
      completedSessions,
      averageScore: avgScore._avg.score || 0,
    });
  })
);

// Get feature adoption
router.get(
  '/adoption',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const features = await prisma.session.groupBy({
      by: ['featureType'],
      where: { userId },
      _count: { id: true },
    });

    const adoption = Object.fromEntries(
      features.map(f => [f.featureType, f._count.id])
    );

    res.json(adoption);
  })
);

export default router;
