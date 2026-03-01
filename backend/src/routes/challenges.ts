import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { ChallengeType } from '@prisma/client';

const router = Router();
router.use(authenticate);

const challengeSchema = z.object({
  receiverUsername: z.string(),
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.nativeEnum(ChallengeType),
  targetValue: z.number().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// POST /api/challenges
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = challengeSchema.parse(req.body);
    const receiver = await prisma.user.findUnique({ where: { username: body.receiverUsername } });
    if (!receiver) { res.status(404).json({ error: 'User not found' }); return; }
    if (receiver.id === req.userId!) { res.status(400).json({ error: 'Cannot challenge yourself' }); return; }

    const challenge = await prisma.challenge.create({
      data: {
        senderId: req.userId!,
        receiverId: receiver.id,
        title: body.title,
        description: body.description,
        type: body.type,
        targetValue: body.targetValue,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      },
    });

    await prisma.notification.create({
      data: {
        userId: receiver.id,
        type: 'CHALLENGE_RECEIVED',
        title: '⚔️ Challenge Received!',
        message: `${req.userId} challenged you: ${body.title}`,
        data: { challengeId: challenge.id },
      },
    });

    res.status(201).json({ challenge });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.errors });
    else res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/challenges
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: { OR: [{ senderId: req.userId! }, { receiverId: req.userId! }] },
      include: {
        sender: { select: { id: true, username: true, name: true, avatar: true, xp: true } },
        receiver: { select: { id: true, username: true, name: true, avatar: true, xp: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ challenges });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/challenges/:id/accept
router.patch('/:id/accept', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenge = await prisma.challenge.findFirst({
      where: { id: req.params.id, receiverId: req.userId!, status: 'PENDING' },
    });
    if (!challenge) { res.status(404).json({ error: 'Challenge not found' }); return; }

    await prisma.challenge.update({ where: { id: challenge.id }, data: { status: 'ACCEPTED' } });
    res.json({ message: 'Challenge accepted! Game on! 🎮' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/challenges/:id/decline
router.patch('/:id/decline', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenge = await prisma.challenge.findFirst({
      where: { id: req.params.id, receiverId: req.userId!, status: 'PENDING' },
    });
    if (!challenge) { res.status(404).json({ error: 'Challenge not found' }); return; }

    await prisma.challenge.update({ where: { id: challenge.id }, data: { status: 'DECLINED' } });
    res.json({ message: 'Challenge declined' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
