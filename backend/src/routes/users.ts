import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getLevel, xpForNextLevel } from '../services/gamification.service';
import { generateStudyAdvice } from '../services/ai.service';

const router = Router();
router.use(authenticate);

// GET /api/users/profile
router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: { badges: { include: { badge: true } } },
    });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }

    const { password: _p, ...safeUser } = user;
    const levelInfo = xpForNextLevel(user.xp);

    res.json({ user: { ...safeUser, levelInfo } });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/users/profile
router.patch('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      branch: z.string().optional(),
      semester: z.number().int().min(1).max(8).optional(),
      college: z.string().optional(),
      leetcodeUsername: z.string().optional(),
      codeforcesHandle: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: body,
      select: {
        id: true, email: true, username: true, name: true,
        branch: true, semester: true, college: true,
        leetcodeUsername: true, codeforcesHandle: true,
        xp: true, level: true,
      },
    });
    res.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.errors });
    else res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/stats
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }

    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);

    const [weeklyTasks, monthlyTasks, subjectBreakdown, recentSessions] = await Promise.all([
      prisma.task.count({
        where: { userId: req.userId!, status: 'COMPLETED', completedAt: { gte: weekAgo } },
      }),
      prisma.task.count({
        where: { userId: req.userId!, status: 'COMPLETED', completedAt: { gte: monthAgo } },
      }),
      prisma.task.groupBy({
        by: ['subject'],
        where: { userId: req.userId!, status: 'COMPLETED' },
        _count: true,
        orderBy: { _count: { subject: 'desc' } },
        take: 5,
      }),
      prisma.studySession.findMany({
        where: { userId: req.userId!, startTime: { gte: weekAgo } },
        orderBy: { startTime: 'desc' },
        take: 7,
      }),
    ]);

    const totalDelayed = await prisma.task.count({
      where: { userId: req.userId!, status: 'DELAYED' },
    });
    const completionRate = user.tasksCompleted > 0
      ? Math.round((user.tasksCompleted / (user.tasksCompleted + totalDelayed)) * 100)
      : 0;

    res.json({
      stats: {
        totalXP: user.xp,
        level: user.level,
        levelInfo: xpForNextLevel(user.xp),
        streak: user.streak,
        totalStudyHours: user.totalStudyHours,
        tasksCompleted: user.tasksCompleted,
        weeklyTasks,
        monthlyTasks,
        completionRate,
        subjectBreakdown,
        recentSessions,
      },
    });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/users/ai-advice
router.get('/ai-advice', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }

    const [delayedCount, pendingCount, completedThisWeek] = await Promise.all([
      prisma.task.count({ where: { userId: req.userId!, status: 'DELAYED' } }),
      prisma.task.count({ where: { userId: req.userId!, status: 'PENDING' } }),
      prisma.task.count({
        where: {
          userId: req.userId!, status: 'COMPLETED',
          completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
    ]);

    const advice = await generateStudyAdvice(req.userId!, {
      streak: user.streak,
      level: user.level,
      totalStudyHours: user.totalStudyHours,
      delayedTasks: delayedCount,
      pendingTasks: pendingCount,
      completedThisWeek,
      branch: user.branch,
    });

    res.json({ advice });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/users/badges
router.get('/badges', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allBadges = await prisma.badge.findMany({ orderBy: { name: 'asc' } });
    const userBadges = await prisma.userBadge.findMany({ where: { userId: req.userId! } });
    const userBadgeMap = Object.fromEntries(userBadges.map(ub => [ub.badgeId, ub]));
    const badges = allBadges.map(b => ({ ...b, userBadge: userBadgeMap[b.id] || null }));
    res.json({ badges });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export { getLevel };
export default router;
