import prisma from '../lib/prisma';

const LEVELS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500];

export function getLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i]) level = i + 1;
  }
  return level;
}

export function xpForNextLevel(xp: number): { current: number; required: number; progress: number } {
  const level = getLevel(xp);
  const current = LEVELS[level - 1] || 0;
  const required = LEVELS[level] || LEVELS[LEVELS.length - 1];
  const progress = Math.round(((xp - current) / (required - current)) * 100);
  return { current: xp - current, required: required - current, progress: Math.min(progress, 100) };
}

export async function awardXP(userId: string, amount: number, _reason?: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return 0;

  const newXP = user.xp + amount;
  const newLevel = getLevel(newXP);

  await prisma.user.update({
    where: { id: userId },
    data: { xp: newXP, level: newLevel },
  });

  if (newLevel > user.level) {
    await prisma.notification.create({
      data: {
        userId,
        type: 'LEVEL_UP',
        title: `Level Up! You're now Level ${newLevel}! 🎉`,
        message: `Keep it up! You've earned ${newXP} XP total.`,
      },
    });
  }

  return amount;
}

export async function checkAndAwardBadges(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { badges: true },
  });
  if (!user) return;

  const earnedBadgeIds = user.badges.map(b => b.badgeId);
  const badges = await prisma.badge.findMany();

  for (const badge of badges) {
    if (earnedBadgeIds.includes(badge.id)) continue;

    const cond = badge.condition as { type: string; value: number };
    let earned = false;

    switch (cond.type) {
      case 'streak': earned = user.streak >= cond.value; break;
      case 'xp': earned = user.xp >= cond.value; break;
      case 'tasks_completed': earned = user.tasksCompleted >= cond.value; break;
      case 'study_hours': earned = user.totalStudyHours >= cond.value; break;
      case 'level': earned = user.level >= cond.value; break;
    }

    if (earned) {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      await awardXP(userId, badge.xpReward, `Badge: ${badge.name}`);
      await prisma.notification.create({
        data: {
          userId,
          type: 'BADGE_EARNED',
          title: `Badge Unlocked: ${badge.name}! 🏆`,
          message: badge.description,
        },
      });
    }
  }
}

export async function updateStreaks(): Promise<void> {
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);

  const users = await prisma.user.findMany({ select: { id: true, lastActiveDate: true, streak: true } });

  for (const user of users) {
    if (!user.lastActiveDate) continue;
    const lastDate = new Date(user.lastActiveDate); lastDate.setHours(0,0,0,0);

    if (lastDate.getTime() === yesterday.getTime()) {
      // Was active yesterday - maintain streak
    } else if (lastDate.getTime() < yesterday.getTime()) {
      // Break streak
      await prisma.user.update({ where: { id: user.id }, data: { streak: 0 } });
    }
  }
}

export async function recordActivity(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastDate = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  const isNewDay = !lastDate || lastDate.getTime() < today.getTime();

  if (isNewDay) {
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive = lastDate?.getTime() === yesterday.getTime();
    const newStreak = isConsecutive ? user.streak + 1 : 1;

    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveDate: new Date(), streak: newStreak },
    });

    if (newStreak > 0 && newStreak % 7 === 0) {
      await awardXP(userId, 50 * (newStreak / 7), `${newStreak}-day streak!`);
    }
  }
}

export async function seedBadges(): Promise<void> {
  const badgeData = [
    { name: 'First Step', description: 'Complete your first task', icon: '🎯', xpReward: 20, condition: { type: 'tasks_completed', value: 1 } },
    { name: 'On Fire', description: '7-day study streak', icon: '🔥', xpReward: 100, condition: { type: 'streak', value: 7 } },
    { name: 'Unstoppable', description: '30-day study streak', icon: '⚡', xpReward: 500, condition: { type: 'streak', value: 30 } },
    { name: 'Scholar', description: 'Accumulate 1000 XP', icon: '📚', xpReward: 50, condition: { type: 'xp', value: 1000 } },
    { name: 'Grind Mode', description: 'Complete 50 tasks', icon: '💪', xpReward: 200, condition: { type: 'tasks_completed', value: 50 } },
    { name: 'Century', description: 'Complete 100 tasks', icon: '🏆', xpReward: 500, condition: { type: 'tasks_completed', value: 100 } },
    { name: 'Night Owl', description: '100 hours of study', icon: '🦉', xpReward: 200, condition: { type: 'study_hours', value: 100 } },
    { name: 'Level 5', description: 'Reach level 5', icon: '⭐', xpReward: 100, condition: { type: 'level', value: 5 } },
    { name: 'Elite', description: 'Reach level 10', icon: '👑', xpReward: 500, condition: { type: 'level', value: 10 } },
  ];

  for (const badge of badgeData) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      create: badge,
      update: {},
    });
  }
}
