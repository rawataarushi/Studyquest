import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { awardXP, checkAndAwardBadges } from '../services/gamification.service';
import { TaskStatus, TaskType, Priority, Difficulty } from '@prisma/client';

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  subject: z.string(),
  type: z.nativeEnum(TaskType).default('STUDY'),
  priority: z.nativeEnum(Priority).default('MEDIUM'),
  difficulty: z.nativeEnum(Difficulty).default('MEDIUM'),
  estimatedHours: z.number().min(0.25).max(24),
  dueDate: z.string().datetime().optional(),
  syllabusId: z.string().optional(),
  isRevision: z.boolean().default(false),
});

// GET /api/tasks
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, subject, date } = req.query;
    const where: Record<string, unknown> = { userId: req.userId! };
    if (status) where.status = status as TaskStatus;
    if (subject) where.subject = subject;
    if (date) {
      const d = new Date(date as string);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.scheduledDate = { gte: d, lt: next };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
    res.json({ tasks });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/tasks/today
router.get('/today', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await prisma.task.findMany({
      where: {
        userId: req.userId!,
        scheduledDate: { gte: today, lt: tomorrow },
      },
      orderBy: [{ scheduledStart: 'asc' }],
    });
    res.json({ tasks });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/tasks
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = taskSchema.parse(req.body);
    const xpReward = calculateXP(body.difficulty, body.type as TaskType);

    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        xpReward,
      },
    });
    res.status(201).json({ task });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.errors });
    else res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/tasks/:id/complete
router.patch('/:id/complete', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    if (task.status === 'COMPLETED') { res.status(400).json({ error: 'Already completed' }); return; }

    const { actualHours } = req.body;

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        actualHours: actualHours || task.estimatedHours,
      },
    });

    // Update user stats
    await prisma.user.update({
      where: { id: req.userId! },
      data: {
        tasksCompleted: { increment: 1 },
        totalStudyHours: { increment: actualHours || task.estimatedHours },
      },
    });

    // Award XP
    const xpGained = await awardXP(req.userId!, task.xpReward, `Completed: ${task.title}`);
    await checkAndAwardBadges(req.userId!);

    res.json({ message: `+${xpGained} XP earned!`, xpGained, task });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/tasks/:id/delay
router.patch('/:id/delay', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason, newDate } = req.body;
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'DELAYED',
        scheduledDate: newDate ? new Date(newDate) : undefined,
      },
    });

    await prisma.notification.create({
      data: {
        userId: req.userId!,
        type: 'DELAY_DETECTED',
        title: 'Task Delayed',
        message: `"${task.title}" has been rescheduled. ${reason || ''}`,
      },
    });

    res.json({ message: 'Task rescheduled' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/tasks/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    const body = taskSchema.partial().parse(req.body);
    const updated = await prisma.task.update({ where: { id: task.id }, data: body });
    res.json({ task: updated });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.errors });
    else res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    await prisma.task.delete({ where: { id: task.id } });
    res.json({ message: 'Task deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

function calculateXP(difficulty: string, type: string): number {
  const base: Record<string, number> = { EASY: 10, MEDIUM: 20, HARD: 35 };
  const bonus: Record<string, number> = {
    STUDY: 1, REVISION: 1.2, ASSIGNMENT: 1.5, PROJECT: 2, EXAM_PREP: 1.8, PRACTICE: 1.3
  };
  return Math.round((base[difficulty] || 20) * (bonus[type] || 1));
}

export default router;
