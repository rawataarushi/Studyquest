import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import cron from 'node-cron';

dotenv.config();

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import routineRoutes from './routes/routines';
import taskRoutes from './routes/tasks';
import timetableRoutes from './routes/timetable';
import syllabusRoutes from './routes/syllabus';
import leaderboardRoutes from './routes/leaderboard';
import integrationRoutes from './routes/integrations';
import sessionRoutes from './routes/sessions';
import challengeRoutes from './routes/challenges';
import notificationRoutes from './routes/notifications';

import { runDelayDetection } from './services/delay.service';
import { updateStreaks } from './services/gamification.service';

const app = express();
const PORT = process.env.PORT || 5000;

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cron jobs
// Delay detection - every hour
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Running delay detection...');
  await runDelayDetection();
});

// Update streaks - midnight daily
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Updating streaks...');
  await updateStreaks();
});

app.listen(PORT, () => {
  console.log(`\n🚀 AI Study Planner Backend running on port ${PORT}`);
  console.log(`📖 Health: http://localhost:${PORT}/health\n`);
});

export default app;
