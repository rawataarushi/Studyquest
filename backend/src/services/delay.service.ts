import prisma from '../lib/prisma';

export async function runDelayDetection(): Promise<void> {
  const now = new Date();

  // Find tasks that are scheduled in the past but not completed
  const delayedTasks = await prisma.task.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      scheduledDate: { lt: now },
      scheduledEnd: { not: null },
    },
    include: { user: true },
  });

  for (const task of delayedTasks) {
    // Check if scheduled end time has passed
    if (task.scheduledDate && task.scheduledEnd) {
      const scheduledEndDatetime = new Date(task.scheduledDate);
      const [h, m] = task.scheduledEnd.split(':').map(Number);
      scheduledEndDatetime.setHours(h, m, 0, 0);

      if (now > scheduledEndDatetime && task.status !== 'DELAYED') {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: 'DELAYED' },
        });

        await prisma.notification.create({
          data: {
            userId: task.userId,
            type: 'DELAY_DETECTED',
            title: '⚠️ Task Overdue',
            message: `"${task.title}" was scheduled for ${task.scheduledEnd} but hasn't been completed.`,
            data: { taskId: task.id },
          },
        });
      }
    }
  }
}
