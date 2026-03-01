import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { recordActivity } from '../services/gamification.service';

const router = Router();
router.use(authenticate);

// POST /api/sessions/start
router.post('/start', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, taskId } = req.body;
    const session = await prisma.studySession.create({
      data: { userId: req.userId!, subject, taskId, startTime: new Date() },
    });
    await recordActivity(req.userId!);
    res.status(201).json({ session });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/sessions/:id/end
router.patch('/:id/end', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productivity, notes } = req.body;
    const session = await prisma.studySession.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    const endTime = new Date();
    const duration = (endTime.getTime() - session.startTime.getTime()) / 60000;

    const updated = await prisma.studySession.update({
      where: { id: session.id },
      data: { endTime, duration, productivity, notes },
    });

    await prisma.user.update({
      where: { id: req.userId! },
      data: { totalStudyHours: { increment: duration / 60 } },
    });

    res.json({ session: updated, durationMinutes: Math.round(duration) });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/sessions
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.studySession.findMany({
      where: { userId: req.userId! },
      orderBy: { startTime: 'desc' },
      take: 30,
    });
    res.json({ sessions });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
