import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CheckSquare, Trophy, BookOpen, User,
  LogOut, Menu, X, Flame, Zap, Bell, Brain, BarChart2, Swords, Clock
} from 'lucide-react'
import { useAuthStore, useUIStore } from '../../store'
import { cn, getLevelTitle } from '../../lib/utils'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../../lib/api'
import NotificationPanel from '../notifications/NotificationPanel'
import { useState } from 'react'
import ActiveSessionTimer from '../sessions/ActiveSessionTimer'
import ThemePicker from '../theme/ThemePicker'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/routine', icon: Clock, label: 'Routine' },
  { to: '/syllabus', icon: BookOpen, label: 'Subjects' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/challenges', icon: Swords, label: 'Challenges' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
    refetchInterval: 30000,
  })

  const unreadCount = notifData?.unreadCount || 0

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col"
          >
            {/* Logo */}
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg gradient-text">StudyQuest</h1>
                  <p className="text-xs text-muted-foreground">AI Study Planner</p>
                </div>
              </div>
            </div>

            {/* User XP Bar */}
            {user && (
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Lv.{user.level} · {getLevelTitle(user.level)}
                  </span>
                  <span className="xp-badge">
                    <Zap className="w-3 h-3" /> {user.xp} XP
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((user.xp % 500) / 5, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs text-orange-400 font-medium">{user.streak} day streak</span>
                </div>
              </div>
            )}

            {/* Nav */}
            <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('w-4.5 h-4.5', isActive ? 'text-primary' : '')} size={18} />
                      {label}
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* User info + logout */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Logout"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex-1" />

          <ActiveSessionTimer />

          <ThemePicker />

          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors relative"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <NotificationPanel
                notifications={notifData?.notifications || []}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
