import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { parseSyllabusWithAI } from '../services/ai.service';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/syllabus
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const syllabuses = await prisma.syllabus.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: { tasks: { orderBy: { createdAt: 'desc' } } },
    });
    res.json({ syllabuses });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/syllabus/add — add a subject manually (no PDF needed)
const addSubjectSchema = z.object({
  subject: z.string().min(1),
  targetDays: z.number().min(1).max(365),
  semester: z.number().optional(),
});

router.post('/add', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = addSubjectSchema.parse(req.body);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + body.targetDays);

    const syllabus = await prisma.syllabus.create({
      data: {
        userId: req.userId!,
        subject: body.subject,
        semester: body.semester,
        targetDays: body.targetDays,
        topics: [],
        totalTopics: 0,
      },
    });

    res.status(201).json({ syllabus, message: `Subject "${body.subject}" added!` });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.errors });
    else res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/syllabus/:id — delete a subject
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!syllabus) { res.status(404).json({ error: 'Subject not found' }); return; }

    // Delete associated tasks
    await prisma.task.deleteMany({ where: { syllabusId: syllabus.id, userId: req.userId! } });
    await prisma.syllabus.delete({ where: { id: syllabus.id } });

    res.json({ message: 'Subject deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/syllabus/upload
router.post('/upload', upload.single('pdf'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No PDF uploaded' }); return; }

    const { subject, semester } = req.body;
    const schema = z.object({ subject: z.string().min(1), semester: z.string().optional() });
    const validated = schema.parse({ subject, semester });

    // Parse PDF
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const rawText = pdfData.text;

    // AI parse topics
    let topics: Array<{ name: string; estimatedHours: number; difficulty: string; week?: number }> = [];
    try {
      const parsed = await parseSyllabusWithAI(rawText, validated.subject);
      topics = parsed.topics;
    } catch {
      topics = [];
    }

    const syllabus = await prisma.syllabus.create({
      data: {
        userId: req.userId!,
        subject: validated.subject,
        semester: validated.semester ? parseInt(validated.semester) : undefined,
        pdfUrl: `/uploads/${req.file.filename}`,
        rawText,
        topics,
        totalTopics: topics.length,
      },
    });

    res.status(201).json({
      syllabus,
      message: `Syllabus uploaded! Found ${topics.length} topics.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

// POST /api/syllabus/:id/generate-tasks
router.post('/:id/generate-tasks', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!syllabus) { res.status(404).json({ error: 'Syllabus not found' }); return; }

    const topics = syllabus.topics as Array<{
      name: string; estimatedHours: number; difficulty: string; week?: number;
    }>;

    const tasks = await Promise.all(topics.map(topic =>
      prisma.task.create({
        data: {
          userId: req.userId!,
          syllabusId: syllabus.id,
          title: topic.name,
          subject: syllabus.subject,
          type: 'STUDY',
          priority: 'MEDIUM',
          difficulty: (topic.difficulty as 'EASY' | 'MEDIUM' | 'HARD') || 'MEDIUM',
          estimatedHours: topic.estimatedHours || 2,
          xpReward: 20,
        },
      })
    ));

    // Also create revision tasks for each topic
    await Promise.all(tasks.map(task =>
      prisma.task.create({
        data: {
          userId: req.userId!,
          syllabusId: syllabus.id,
          title: `Revise: ${task.title}`,
          subject: syllabus.subject,
          type: 'REVISION',
          priority: 'MEDIUM',
          difficulty: 'EASY',
          estimatedHours: task.estimatedHours * 0.4,
          isRevision: true,
          parentTaskId: task.id,
          xpReward: 15,
        },
      })
    ));

    res.json({ message: `Generated ${tasks.length} study tasks + ${tasks.length} revision tasks!` });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/syllabus/:id/progress
router.get('/:id/progress', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: {
        tasks: { where: { isRevision: false } },
      },
    });
    if (!syllabus) { res.status(404).json({ error: 'Not found' }); return; }

    const completed = syllabus.tasks.filter(t => t.status === 'COMPLETED').length;
    const total = syllabus.tasks.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({ progress, completed, total, subject: syllabus.subject });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
