import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

// GET /api/notifications
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.userId!, isRead: false },
    });
    res.json({ notifications, unreadCount });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { isRead: true },
    });
    res.json({ message: 'Marked as read' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
