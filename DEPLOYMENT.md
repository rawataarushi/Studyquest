# StudyQuest – Free Deployment Guide

This guide walks you through deploying StudyQuest **completely free** using:

| Component | Service | Free tier |
|-----------|---------|-----------|
| Frontend | **Vercel** | Unlimited for hobby |
| Backend | **Render** | 750 hrs/month free |
| Database | **MongoDB Atlas** | 512 MB free forever |

---

## Prerequisites

- A **GitHub** account (push your code there first)
- Accounts on [Vercel](https://vercel.com), [Render](https://render.com), and [MongoDB Atlas](https://www.mongodb.com/atlas) (all free)

---

## Step 0 — Push to GitHub

If you haven't already:

```bash
cd d:\Projects\ai_study
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/Studyquest.git
git push -u origin main
```

> **IMPORTANT — SECURITY WARNING**  
> Your `.env` file contains real credentials (database password, JWT secret, OpenAI key).  
> Make sure `.env` is in `.gitignore` and **never** committed to Git.  
> If you've already pushed it, rotate ALL your secrets immediately:
> - Change your MongoDB Atlas password
> - Generate a new JWT_SECRET
> - Regenerate your OpenAI API key at https://platform.openai.com/api-keys

---

## Step 1 — Database (MongoDB Atlas)

You already have a MongoDB Atlas cluster! Just make sure:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Navigate to **Network Access** → **Add IP Address**
3. Click **"Allow Access from Anywhere"** (`0.0.0.0/0`) — required for Render/Vercel to connect
4. Copy your connection string (you already have it in your `.env`)

---

## Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **Dashboard** → **New +** → **Web Service**
2. Connect your GitHub repo
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Name** | `studyquest-api` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npm run build && npx prisma db push` |
   | **Start Command** | `node dist/index.js` |
   | **Instance Type** | **Free** |

4. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `mongodb+srv://...` (your full connection string) |
   | `JWT_SECRET` | (your secret — generate a new one for production) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `OPENAI_API_KEY` | `sk-proj-...` (your OpenAI key) |
   | `FRONTEND_URL` | *(leave blank for now, we'll fill after deploying frontend)* |

5. Click **Create Web Service**
6. Wait for the build to finish (2-5 minutes)
7. Your backend URL will be: `https://studyquest-api.onrender.com`
8. Test it by visiting `https://studyquest-api.onrender.com/health`

> **Note:** Render free tier spins down after 15 min of inactivity. First request after sleep takes ~30 seconds. This is normal.

---

## Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repo
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | `Vite` |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build` (default) |
   | **Output Directory** | `dist` (default) |

4. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://studyquest-api.onrender.com/api` |

   > Replace `studyquest-api` with whatever name Render gave your service.

5. Click **Deploy**
6. Your frontend URL will be something like: `https://studyquest-xxx.vercel.app`

---

## Step 4 — Connect Frontend ↔ Backend

Now go back to **Render Dashboard** → your backend service → **Environment**:

1. Set `FRONTEND_URL` to your Vercel URL (e.g., `https://studyquest-xxx.vercel.app`)
2. Click **Save Changes** — Render will auto-redeploy

---

## Step 5 — Verify Everything Works

1. Visit your Vercel frontend URL  
2. Register a new account  
3. Check that login, tasks, timetable, etc. all work  
4. If you see CORS errors, double-check `FRONTEND_URL` on Render matches your exact Vercel URL (no trailing slash)

---

## Troubleshooting

### CORS errors
- Make sure `FRONTEND_URL` on Render **exactly** matches your Vercel URL
- No trailing slash: `https://studyquest.vercel.app` not `https://studyquest.vercel.app/`

### Backend returns 503 or takes 30+ seconds
- Render free tier sleeps after 15 min. The first request "wakes" it up — this is normal.
- Consider using an uptime monitor like [UptimeRobot](https://uptimerobot.com) (free) to ping your `/health` endpoint every 14 min to keep it awake.

### Build fails on Render
- Make sure **Root Directory** is set to `backend`
- Check that `prisma/schema.prisma` exists in the backend folder
- Look at the Render build logs for specific errors

### Build fails on Vercel
- Make sure **Root Directory** is set to `frontend`
- Ensure `VITE_API_URL` is set (it's baked in at build time)

### Database connection issues
- Go to MongoDB Atlas → Network Access → ensure `0.0.0.0/0` is allowed
- Check your `DATABASE_URL` is correct in Render env vars

---

## Custom Domain (Optional)

### Vercel (Frontend)
1. Vercel Dashboard → your project → **Settings** → **Domains**
2. Add your domain and follow DNS instructions

### Render (Backend)
1. Render Dashboard → your service → **Settings** → **Custom Domains**
2. Add your domain and configure DNS

---

## Summary of Environment Variables

### Backend (Render)
```env
NODE_ENV=production
DATABASE_URL=mongodb+srv://...
JWT_SECRET=<generate-a-strong-random-string>
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=sk-proj-...
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (Vercel)
```env
VITE_API_URL=https://your-backend.onrender.com/api
```

---

That's it! Your StudyQuest app is now live and free. 🎉
