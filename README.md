# StudyQuest — AI-Powered Study Planner for Engineers

A full-stack web application that helps engineering students plan, track, and gamify their study sessions with AI-powered scheduling and competitive features.

## ✨ Features

- **AI Timetable Generation** — GPT-4o analyzes your daily routine and tasks to generate an optimal weekly study schedule
- **Smart Task Management** — Create tasks with types (study/revision/assignment/project), priorities, deadlines, and difficulty levels
- **Delay Detection** — Automatic detection of overdue tasks with notifications (runs every hour via cron)
- **Gamification** — Earn XP, level up, unlock badges, and maintain streaks
- **Leaderboard** — Compete globally or weekly on XP and study hours
- **Challenges** — Challenge specific users on tasks, study hours, streaks, XP, or LeetCode problems
- **Syllabus Manager** — Upload PDF syllabuses; AI extracts topics and auto-creates study + revision tasks
- **Coding Platform Integration** — Connect LeetCode and Codeforces to track problem-solving stats
- **Analytics** — Charts for study hours, task breakdown, subject distribution, and productivity patterns
- **Study Sessions** — Track active study sessions with a live timer

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| State | Zustand + TanStack React Query |
| Charts | Recharts |
| Animations | Framer Motion |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| AI | OpenAI GPT-4o |
| Auth | JWT + bcryptjs |
| PDF | pdf-parse |
| Scheduling | node-cron |
| Deploy | Vercel (frontend) + Railway (backend + DB) |

---

## 🚀 Local Setup

### Prerequisites
- Node.js ≥ 18
- PostgreSQL database (local or cloud)
- OpenAI API key

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/studyquest"
JWT_SECRET="your-super-secret-jwt-key-change-this"
OPENAI_API_KEY="sk-..."
PORT=5000
NODE_ENV=development
```

### 3. Set Up Database

```bash
cd backend
npx prisma db push        # Creates tables from schema
npx prisma generate       # Generates Prisma client
```

### 4. Start Development Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

App will be at: http://localhost:5173  
Backend API at: http://localhost:5000

---

## 📦 Project Structure

```
ai_study/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── index.ts               # Express server entry
│   │   ├── lib/
│   │   │   └── prisma.ts          # Prisma client singleton
│   │   ├── middleware/
│   │   │   └── auth.ts            # JWT auth middleware
│   │   ├── routes/                # All API route handlers
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── routines.ts
│   │   │   ├── tasks.ts
│   │   │   ├── timetable.ts
│   │   │   ├── syllabus.ts
│   │   │   ├── leaderboard.ts
│   │   │   ├── sessions.ts
│   │   │   ├── integrations.ts
│   │   │   ├── challenges.ts
│   │   │   └── notifications.ts
│   │   └── services/
│   │       ├── ai.service.ts       # OpenAI GPT-4o integration
│   │       ├── gamification.service.ts  # XP, badges, streaks
│   │       └── delay.service.ts    # Overdue task detection
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── railway.json               # Railway deployment config
│   └── Procfile
├── frontend/
│   ├── src/
│   │   ├── pages/                 # All page components
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Timetable.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── Routine.tsx
│   │   │   ├── Syllabus.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Challenges.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   └── Profile.tsx
│   │   ├── components/
│   │   │   ├── layout/Layout.tsx  # Sidebar + topbar
│   │   │   ├── sessions/ActiveSessionTimer.tsx
│   │   │   └── notifications/NotificationPanel.tsx
│   │   ├── lib/
│   │   │   ├── api.ts             # Axios API client
│   │   │   └── utils.ts           # Utility functions
│   │   ├── store/index.ts         # Zustand global state
│   │   └── App.tsx                # React Router setup
│   ├── vercel.json                # Vercel deployment config
│   └── package.json
└── README.md
```

---

## ☁️ Cloud Deployment

### Backend → Railway

1. Go to [railway.app](https://railway.app) and create a new project
2. Add a **PostgreSQL** database plugin
3. Create a new service from your GitHub repo (point to `/backend`)
4. Set environment variables in Railway dashboard:
   - `DATABASE_URL` — auto-filled by Railway PostgreSQL plugin
   - `JWT_SECRET` — any long random string
   - `OPENAI_API_KEY` — your OpenAI key
   - `PORT` — `5000`
   - `NODE_ENV` — `production`
5. Railway will auto-detect `railway.json` and deploy

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) and import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   - `VITE_API_URL` — your Railway backend URL (e.g. `https://your-app.railway.app/api`)
4. Vercel will auto-detect `vercel.json` and deploy

> **Note:** Update `frontend/src/lib/api.ts` baseURL to use `import.meta.env.VITE_API_URL` for production.

---

## 🎮 Gamification System

| Milestone | XP Earned |
|-----------|-----------|
| Complete EASY task | 10 XP |
| Complete MEDIUM task | 20 XP |
| Complete HARD task | 40 XP |
| EXAM_PREP bonus | 1.5× multiplier |
| PRACTICE bonus | 1.2× multiplier |
| Registration welcome | 100 XP |

**Badges:** First Step, On Fire (7-day streak), Unstoppable (30-day streak), Scholar (1000 XP), Grind Mode (50 tasks), Century (100 tasks), Night Owl (100h study), Level 5, Elite (Level 10)

**Levels:** 1 (0 XP) → 2 (100) → 3 (300) → 4 (600) → 5 (1000) → 6 (1500) → 7 (2200) → 8 (3000) → 9 (4000) → 10 (5500) → MAX (7500)

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET/PATCH | `/api/users/profile` | Profile management |
| GET | `/api/users/stats` | Performance stats |
| GET | `/api/users/badges` | All badges with earned status |
| POST/GET | `/api/routines` | Daily routine management |
| GET | `/api/routines/available-slots` | Computed free time slots |
| GET/POST | `/api/tasks` | Task CRUD |
| GET | `/api/tasks/today` | Today's tasks |
| PATCH | `/api/tasks/:id/complete` | Complete task + award XP |
| POST | `/api/timetable/generate` | AI timetable generation |
| GET | `/api/timetable/today` | Today's schedule |
| POST | `/api/syllabus/upload` | Upload PDF syllabus |
| POST | `/api/syllabus/:id/generate-tasks` | AI task generation from syllabus |
| GET | `/api/leaderboard/global` | Global XP leaderboard |
| GET | `/api/integrations/leetcode/:username` | LeetCode stats |
| GET | `/api/integrations/codeforces/:handle` | Codeforces stats |
| GET/POST | `/api/challenges` | Challenge management |
| POST/PATCH | `/api/sessions/start` | Study session tracking |
| GET | `/api/notifications` | User notifications |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

## 📄 License

MIT
