import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateTimetableWithAI, generateTimetableFromSubjects } from '../services/ai.service';

const router = Router();
router.use(authenticate);

// GET /api/timetable/current
router.get('/current', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const timetable = await prisma.timetable.findFirst({
      where: { userId: req.userId!, isActive: true, weekEnd: { gte: today } },
      include: { entries: { orderBy: [{ day: 'asc' }, { startTime: 'asc' }] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!timetable) { res.status(404).json({ error: 'No active timetable' }); return; }
    res.json({ timetable });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/timetable/today
router.get('/today', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const timetable = await prisma.timetable.findFirst({
      where: { userId: req.userId!, isActive: true, weekEnd: { gte: today } },
      include: {
        entries: {
          where: { date: { gte: today, lt: tomorrow } },
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ entries: timetable?.entries || [] });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/timetable/generate
router.post('/generate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const genSchema = z.object({
      weekStart: z.string().datetime().optional(),
    });
    const { weekStart } = genSchema.parse(req.body);

    const routine = await prisma.routine.findUnique({ where: { userId: req.userId! } });
    if (!routine) { res.status(400).json({ error: 'Please set your daily routine first' }); return; }

    const tasks = await prisma.task.findMany({
      where: {
        userId: req.userId!,
        status: { in: ['PENDING', 'IN_PROGRESS', 'DELAYED'] },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 50,
    });

    // If no tasks, try subjects with targetDays
    const syllabuses = await prisma.syllabus.findMany({
      where: { userId: req.userId! },
      select: { id: true, subject: true, targetDays: true },
    });

    if (tasks.length === 0 && syllabuses.length === 0) {
      res.status(400).json({ error: 'Add some subjects first before generating a timetable' });
      return;
    }

    const start = weekStart ? new Date(weekStart) : getMondayOfCurrentWeek();
    const end = new Date(start); end.setDate(end.getDate() + 6);

    // Deactivate old timetable
    await prisma.timetable.updateMany({
      where: { userId: req.userId!, isActive: true },
      data: { isActive: false },
    });

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });

    let timetableData;
    if (tasks.length > 0) {
      timetableData = await generateTimetableWithAI({ routine, tasks, user, weekStart: start });
    } else {
      // Generate from subjects + targetDays directly
      timetableData = await generateTimetableFromSubjects({
        routine: {
          wakeUpTime: routine.wakeUpTime,
          sleepTime: routine.sleepTime,
          preferredSessionLength: routine.preferredSessionLength,
          breakDuration: routine.breakDuration,
          fixedBlocks: routine.fixedBlocks,
        },
        subjects: syllabuses.map(s => ({ id: s.id, subject: s.subject, targetDays: s.targetDays })),
        user: user ? { name: user.name, branch: user.branch || undefined, semester: user.semester || undefined } : null,
        weekStart: start,
      });
    }

    const timetable = await prisma.timetable.create({
      data: {
        userId: req.userId!,
        weekStart: start,
        weekEnd: end,
        aiGenerated: true,
        entries: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: timetableData.entries as any[],
        },
      },
      include: { entries: { orderBy: [{ day: 'asc' }, { startTime: 'asc' }] } },
    });

    // Assign scheduled dates to tasks
    const entries = (timetable as any).entries as Array<{ taskId: string | null; date: Date; startTime: Date; endTime: Date }>;
    for (const entry of entries) {
      if (entry.taskId) {
        await prisma.task.update({
          where: { id: entry.taskId },
          data: {
            scheduledDate: entry.date,
            scheduledStart: entry.startTime instanceof Date
              ? entry.startTime.toISOString().slice(11, 16)
              : String(entry.startTime),
            scheduledEnd: entry.endTime instanceof Date
              ? entry.endTime.toISOString().slice(11, 16)
              : String(entry.endTime),
            status: 'IN_PROGRESS',
          },
        }).catch(() => {});
      }
    }

    res.json({ timetable, message: 'AI timetable generated!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate timetable' });
  }
});

// PATCH /api/timetable/entries/:id/complete
router.patch('/entries/:id/complete', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const entry = await prisma.timetableEntry.updateMany({
      where: { id: req.params.id, timetable: { userId: req.userId! } },
      data: { isCompleted: true },
    });
    if (entry.count === 0) { res.status(404).json({ error: 'Entry not found' }); return; }
    res.json({ message: 'Entry marked complete' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/timetable/entries/:id/toggle
router.patch('/entries/:id/toggle', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // First get the current state
    const entry = await prisma.timetableEntry.findFirst({
      where: { id: req.params.id, timetable: { userId: req.userId! } },
    });
    
    if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }
    
    // Toggle the completion status
    const updated = await prisma.timetableEntry.updateMany({
      where: { id: req.params.id, timetable: { userId: req.userId! } },
      data: { isCompleted: !entry.isCompleted },
    });
    
    res.json({ message: entry.isCompleted ? 'Entry marked incomplete' : 'Entry marked complete' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

function getMondayOfCurrentWeek(): Date {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
}

export default router;
