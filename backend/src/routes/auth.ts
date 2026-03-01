import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { awardXP, seedBadges } from '../services/gamification.service';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  name: z.string().min(2),
  branch: z.string().optional(),
  semester: z.number().int().min(1).max(8).optional(),
  college: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { username: body.username }] },
    });
    if (existing) {
      res.status(400).json({ error: 'Email or username already taken' });
      return;
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        password: hashedPassword,
        name: body.name,
        branch: body.branch,
        semester: body.semester,
        college: body.college,
        xp: 100, // Welcome XP
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        branch: true,
        semester: true,
        college: true,
        xp: true,
        level: true,
        streak: true,
        avatar: true,
        createdAt: true,
      },
    });

    await seedBadges();
    await awardXP(user.id, 100, 'Welcome bonus!');

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    } as jwt.SignOptions);

    res.status(201).json({ user, token, message: 'Welcome! +100 XP for joining!' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveDate: new Date() },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    } as jwt.SignOptions);

    const { password: _p, ...safeUser } = user;

    res.json({ user: safeUser, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) { res.status(401).json({ error: 'No token' }); return; }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, email: true, username: true, name: true,
        branch: true, semester: true, college: true,
        xp: true, level: true, streak: true, avatar: true,
        leetcodeUsername: true, codeforcesHandle: true,
        totalStudyHours: true, tasksCompleted: true,
        badges: { include: { badge: true } },
        createdAt: true,
      },
    });

    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
