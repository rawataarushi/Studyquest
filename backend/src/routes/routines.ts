import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateRoutineFromOnboarding, OnboardingAnswers } from '../services/ai.service';

const router = Router();
router.use(authenticate);

const routineSchema = z.object({
  wakeUpTime: z.string().regex(/^\d{2}:\d{2}$/),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/),
  fixedBlocks: z.array(z.object({
    day: z.number().min(0).max(6),
    startTime: z.string(),
    endTime: z.string(),
    label: z.string(),
  })).default([]),
  studyDaysPerWeek: z.number().min(1).max(7).default(6),
  preferredSessionLength: z.number().min(30).max(180).default(90),
  breakDuration: z.number().min(5).max(60).default(15),
});

// GET /api/routines
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const routine = await prisma.routine.findUnique({ where: { userId: req.userId! } });
    if (!routine) { res.status(404).json({ error: 'No routine set' }); return; }
    res.json({ routine });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/routines
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = routineSchema.parse(req.body);
    const routine = await prisma.routine.upsert({
      where: { userId: req.userId! },
      create: { userId: req.userId!, ...body },
      update: body,
    });
    res.json({ routine, message: 'Routine saved!' });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.errors });
    else res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/routines/available-slots
router.get('/available-slots', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const routine = await prisma.routine.findUnique({ where: { userId: req.userId! } });
    if (!routine) { res.status(404).json({ error: 'Set routine first' }); return; }

    const slots = computeAvailableSlots(routine);
    res.json({ slots });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/routines/generate — AI-powered routine generation from onboarding quiz
const onboardingSchema = z.object({
  chronotype: z.enum(['early_bird', 'night_owl', 'flexible']),
  focusDuration: z.enum(['short', 'medium', 'long']),
  studyStyle: z.enum(['intense', 'balanced', 'relaxed']),
  peakEnergy: z.enum(['morning', 'afternoon', 'evening']),
  breakPreference: z.enum(['frequent', 'moderate', 'rare']),
  exerciseTime: z.enum(['morning', 'evening', 'none']),
  subjects: z.array(z.object({
    name: z.string(),
    deadline: z.string().optional(),
    priority: z.enum(['high', 'medium', 'low']),
  })).default([]),
});

router.post('/generate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const answers = onboardingSchema.parse(req.body) as OnboardingAnswers;
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    const result = await generateRoutineFromOnboarding(answers, user?.name);

    // Auto-save the routine
    const routine = await prisma.routine.upsert({
      where: { userId: req.userId! },
      create: {
        userId: req.userId!,
        wakeUpTime: result.wakeUpTime,
        sleepTime: result.sleepTime,
        fixedBlocks: result.fixedBlocks,
        studyDaysPerWeek: result.studyDaysPerWeek,
        preferredSessionLength: result.preferredSessionLength,
        breakDuration: result.breakDuration,
      },
      update: {
        wakeUpTime: result.wakeUpTime,
        sleepTime: result.sleepTime,
        fixedBlocks: result.fixedBlocks,
        studyDaysPerWeek: result.studyDaysPerWeek,
        preferredSessionLength: result.preferredSessionLength,
        breakDuration: result.breakDuration,
      },
    });

    res.json({ routine, studyPlan: result.studyPlan, message: 'Routine generated!' });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.errors });
    else {
      console.error('Generate routine error:', err);
      res.status(500).json({ error: 'Failed to generate routine' });
    }
  }
});

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function computeAvailableSlots(routine: {
  wakeUpTime: string;
  sleepTime: string;
  fixedBlocks: unknown;
  studyDaysPerWeek: number;
  preferredSessionLength: number;
  breakDuration: number;
}) {
  const blocks = routine.fixedBlocks as Array<{
    day: number; startTime: string; endTime: string; label: string;
  }>;

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const studyDays = [1,2,3,4,5,6].slice(0, routine.studyDaysPerWeek);

  return studyDays.map(day => {
    const dayBlocks = blocks.filter(b => b.day === day).sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    const wakeUp = timeToMinutes(routine.wakeUpTime);
    const sleep = timeToMinutes(routine.sleepTime);
    const freeSlots: { startTime: string; endTime: string; durationMins: number }[] = [];

    let cursor = wakeUp;
    for (const block of dayBlocks) {
      const blockStart = timeToMinutes(block.startTime);
      if (blockStart > cursor) {
        freeSlots.push({
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(blockStart),
          durationMins: blockStart - cursor,
        });
      }
      cursor = Math.max(cursor, timeToMinutes(block.endTime));
    }
    if (sleep > cursor) {
      freeSlots.push({
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(sleep),
        durationMins: sleep - cursor,
      });
    }

    const usableSlots = freeSlots.filter(s => s.durationMins >= routine.preferredSessionLength);
    const totalStudyMins = usableSlots.reduce((acc, s) => acc + s.durationMins, 0);

    return {
      day,
      dayName: days[day],
      freeSlots: usableSlots,
      totalStudyMinutes: totalStudyMins,
      totalStudyHours: +(totalStudyMins / 60).toFixed(1),
    };
  });
}

export { computeAvailableSlots };
export default router;
