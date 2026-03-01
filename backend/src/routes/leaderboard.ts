import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

// GET /api/leaderboard/global
router.get('/global', async (_req, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { xp: 'desc' },
      take: 50,
      select: {
        id: true, username: true, name: true, avatar: true,
        xp: true, level: true, streak: true, tasksCompleted: true,
        totalStudyHours: true, branch: true, college: true,
        badges: { include: { badge: true }, take: 3, orderBy: { earnedAt: 'desc' } },
      },
    });

    const leaderboard = users.map((u, i) => ({ ...u, rank: i + 1 }));
    res.json({ leaderboard });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/leaderboard/weekly
router.get('/weekly', async (_req, res: Response): Promise<void> => {
  try {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

    const sessions = await prisma.studySession.groupBy({
      by: ['userId'],
      where: { startTime: { gte: weekAgo } },
      _sum: { duration: true },
      _count: true,
      orderBy: { _sum: { duration: 'desc' } },
      take: 50,
    });

    const userIds = sessions.map(s => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, name: true, avatar: true, xp: true, level: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    const weekly = sessions.map((s, i) => ({
      rank: i + 1,
      ...userMap.get(s.userId),
      weeklyStudyMinutes: s._sum.duration || 0,
      tasksThisWeek: s._count,
    }));

    res.json({ leaderboard: weekly });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/leaderboard/my-rank
router.get('/my-rank', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const rank = await prisma.user.count({ where: { xp: { gt: user.xp } } });

    res.json({ rank: rank + 1, user: { id: user.id, xp: user.xp, level: user.level, streak: user.streak } });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
