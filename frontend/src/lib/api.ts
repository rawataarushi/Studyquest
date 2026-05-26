import axios from 'axios'
import { useAuthStore } from '../store'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Auth interceptor
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  register: (data: { email: string; username: string; password: string; name: string; branch?: string; semester?: number; college?: string }) =>
    api.post('/auth/register', data).then(r => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
}

// Users
export const usersApi = {
  getProfile: () => api.get('/users/profile').then(r => r.data),
  updateProfile: (data: Record<string, unknown>) => api.patch('/users/profile', data).then(r => r.data),
  getStats: (period?: string) => api.get('/users/stats', { params: period ? { period } : undefined }).then(r => r.data),
  getBadges: () => api.get('/users/badges').then(r => r.data),
  getAIAdvice: () => api.get('/users/ai-advice').then(r => r.data),
  getAll: () => api.get('/users/all').then(r => r.data),
}

// Routines
export const routinesApi = {
  get: () => api.get('/routines').then(r => r.data),
  save: (data: Record<string, unknown>) => api.post('/routines', data).then(r => r.data),
  getSlots: () => api.get('/routines/available-slots').then(r => r.data),
  generate: (answers: Record<string, unknown>) => api.post('/routines/generate', answers).then(r => r.data),
}

// Tasks
export const tasksApi = {
  getAll: (params?: Record<string, string>) => api.get('/tasks', { params }).then(r => r.data),
  getToday: () => api.get('/tasks/today').then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/tasks', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/tasks/${id}`, data).then(r => r.data),
  complete: (id: string, actualHours?: number) => api.patch(`/tasks/${id}/complete`, { actualHours }).then(r => r.data),
  delay: (id: string, reason?: string, newDate?: string) => api.patch(`/tasks/${id}/delay`, { reason, newDate }).then(r => r.data),
  delete: (id: string) => api.delete(`/tasks/${id}`).then(r => r.data),
}

// Timetable
export const timetableApi = {
  getCurrent: () => api.get('/timetable/current').then(r => r.data),
  getToday: () => api.get('/timetable/today').then(r => r.data),
  generate: (weekStart?: string) => api.post('/timetable/generate', { weekStart }).then(r => r.data),
  completeEntry: (id: string) => api.patch(`/timetable/entries/${id}/complete`).then(r => r.data),
  toggleEntry: (id: string) => api.patch(`/timetable/entries/${id}/toggle`).then(r => r.data),
}

// Syllabus / Subjects
export const syllabusApi = {
  getAll: () => api.get('/syllabus').then(r => r.data),
  addSubject: (data: { subject: string; targetDays: number; semester?: number }) =>
    api.post('/syllabus/add', data).then(r => r.data),
  deleteSubject: (id: string) => api.delete(`/syllabus/${id}`).then(r => r.data),
  upload: (formData: FormData) => api.post('/syllabus/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data),
  generateTasks: (id: string) => api.post(`/syllabus/${id}/generate-tasks`).then(r => r.data),
  getProgress: (id: string) => api.get(`/syllabus/${id}/progress`).then(r => r.data),
}

// Leaderboard
export const leaderboardApi = {
  getGlobal: () => api.get('/leaderboard/global').then(r => r.data),
  getWeekly: () => api.get('/leaderboard/weekly').then(r => r.data),
  getMyRank: () => api.get('/leaderboard/my-rank').then(r => r.data),
}

// Sessions
export const sessionsApi = {
  start: (data: { subject: string; taskId?: string }) => api.post('/sessions/start', data).then(r => r.data),
  end: (id: string, data?: { productivity?: number; notes?: string }) => api.patch(`/sessions/${id}/end`, data).then(r => r.data),
  getAll: () => api.get('/sessions').then(r => r.data),
}

// Integrations
export const integrationsApi = {
  getLeetCode: (username: string) => api.get(`/integrations/leetcode/${username}`).then(r => r.data),
  getCodeforces: (handle: string) => api.get(`/integrations/codeforces/${handle}`).then(r => r.data),
  getMyStats: () => api.get('/integrations/my-stats').then(r => r.data),
}

// Challenges
export const challengesApi = {
  getAll: () => api.get('/challenges').then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/challenges', data).then(r => r.data),
  accept: (id: string) => api.patch(`/challenges/${id}/accept`).then(r => r.data),
  decline: (id: string) => api.patch(`/challenges/${id}/decline`).then(r => r.data),
}

// Notifications
export const notificationsApi = {
  getAll: () => api.get('/notifications').then(r => r.data),
  readAll: () => api.patch('/notifications/read-all').then(r => r.data),
  read: (id: string) => api.patch(`/notifications/${id}/read`).then(r => r.data),
}

export default api
