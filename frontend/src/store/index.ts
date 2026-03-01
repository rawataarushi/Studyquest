import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  username: string
  name: string
  branch?: string
  semester?: number
  college?: string
  xp: number
  level: number
  streak: number
  avatar?: string
  leetcodeUsername?: string
  codeforcesHandle?: string
  totalStudyHours: number
  tasksCompleted: number
  badges?: Array<{ badge: { name: string; icon: string; description: string } }>
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  updateUser: (user: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      updateUser: (data) => set(state => ({ user: state.user ? { ...state.user, ...data } : null })),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'studyquest-auth' }
  )
)

interface UIState {
  sidebarOpen: boolean
  activeSession: { id: string; subject: string; startTime: Date } | null
  accentColor: string
  setSidebarOpen: (open: boolean) => void
  setActiveSession: (session: UIState['activeSession']) => void
  setAccentColor: (color: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeSession: null,
      accentColor: 'blue',
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setActiveSession: (session) => set({ activeSession: session }),
      setAccentColor: (color) => set({ accentColor: color }),
    }),
    { name: 'studyquest-ui', partialize: (state) => ({ accentColor: state.accentColor }) }
  )
)
