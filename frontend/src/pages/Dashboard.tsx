import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { usersApi, tasksApi, timetableApi, sessionsApi, routinesApi } from '../lib/api'
import { useAuthStore, useUIStore } from '../store'
import {
  Zap, Flame, Trophy, Clock, CheckSquare, TrendingUp, Play, BookOpen,
  AlertTriangle, Calendar, BarChart2, Brain
} from 'lucide-react'
import { cn, getStatusColor, getTaskTypeIcon, getPriorityColor, getLevelTitle, xpToNextLevel } from '../lib/utils'
import { Link, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { RadialBarChart, RadialBar, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const StatCard = ({ icon: Icon, label, value, sub, color = 'blue' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string
}) => {
  const colors: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/10 text-blue-400',
    yellow: 'from-yellow-500/20 to-yellow-600/10 text-yellow-400',
    green: 'from-green-500/20 to-green-600/10 text-green-400',
    purple: 'from-purple-500/20 to-purple-600/10 text-purple-400',
    orange: 'from-orange-500/20 to-orange-600/10 text-orange-400',
  }
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`card-glass p-5 bg-gradient-to-br ${colors[color]} border-0`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <Icon size={22} className="opacity-70" />
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const { setActiveSession } = useUIStore()
  const qc = useQueryClient()
  const [selectedDayOffset, setSelectedDayOffset] = useState(0) // 0 = Today, 1 = Tomorrow, etc.

  // Check if user has a routine — redirect to setup if not
  const { data: routineData, isLoading: routineLoading, isError: routineError } = useQuery({
    queryKey: ['routine'], queryFn: routinesApi.get, retry: false,
  })

  // Check if user has subjects
  const { data: syllabusData, isLoading: syllabusLoading } = useQuery({
    queryKey: ['syllabuses'], queryFn: () => import('../lib/api').then(m => m.syllabusApi.getAll()), retry: false,
  })

  const { data: statsData } = useQuery({ queryKey: ['user-stats'], queryFn: () => usersApi.getStats() })
  const { data: todayData, isLoading: loadingToday } = useQuery({ queryKey: ['today-tasks'], queryFn: tasksApi.getToday })
  const { data: timetableData } = useQuery({ queryKey: ['timetable-current'], queryFn: timetableApi.getCurrent })
  const { data: adviceData } = useQuery({ queryKey: ['ai-advice'], queryFn: usersApi.getAIAdvice, staleTime: 1000 * 60 * 10 })

  const completeMutation = useMutation({
    mutationFn: (id: string) => tasksApi.complete(id),
    onSuccess: (data) => {
      toast.success(data.message || 'Task completed! 🎯')
      qc.invalidateQueries({ queryKey: ['today-tasks'] })
      qc.invalidateQueries({ queryKey: ['user-stats'] })
    },
  })

  const startSessionMutation = useMutation({
    mutationFn: (data: { subject: string; taskId?: string }) => sessionsApi.start(data),
    onSuccess: (data, variables) => {
      setActiveSession({ id: data.session.id, subject: variables.subject, startTime: new Date() })
      toast.success('Study session started! 📚')
    },
  })

  const completeEntryMutation = useMutation({
    mutationFn: (id: string) => timetableApi.toggleEntry(id),
    onSuccess: () => {
      toast.success('Status updated! ✓')
      qc.invalidateQueries({ queryKey: ['timetable-current'] })
      qc.invalidateQueries({ queryKey: ['user-stats'] })
    },
    onError: () => {
      toast.error('Failed to update slot')
    },
  })

  const stats = statsData?.stats
  const todayTasks = todayData?.tasks || []
  const allEntries = timetableData?.timetable?.entries || []

  const completedToday = todayTasks.filter((t: { status: string }) => t.status === 'COMPLETED').length
  const totalToday = todayTasks.length

  const xpProgress = user ? Math.round((user.xp % 500) / 5) : 0

  // Get entries for selected day
  const getEntriesForDay = (dayOffset: number) => {
    const selectedDate = new Date()
    selectedDate.setDate(selectedDate.getDate() + dayOffset)
    const selectedDateStr = selectedDate.toISOString().split('T')[0]
    
    return allEntries.filter((entry: any) => {
      if (!entry.date) return dayOffset === 0 // fallback for today if no date field
      return entry.date.split('T')[0] === selectedDateStr
    })
  }

  const selectedDayEntries = getEntriesForDay(selectedDayOffset)

  // Helper function to format time (handles HH:MM and decimal formats like 10.5 or 10.5:00)
  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'N/A'
    
    let clean = timeStr.trim()
    
    // Remove trailing :00 if present (e.g., "10.5:00" -> "10.5")
    if (clean.endsWith(':00')) {
      clean = clean.substring(0, clean.length - 3)
    }
    
    // Handle already-formatted HH:MM (e.g., "08:30")
    if (clean.match(/^\d{1,2}:\d{2}$/)) {
      return clean
    }
    
    // Handle decimal format (e.g., "10.5" or "8.75")
    const decimalMatch = clean.match(/^(\d{1,2})\.(\d+)$/)
    if (decimalMatch) {
      const hours = parseInt(decimalMatch[1], 10)
      const decimalPart = parseFloat(`0.${decimalMatch[2]}`)
      const minutes = Math.round(decimalPart * 60)
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
    
    // Try parsing as pure decimal
    const time = parseFloat(clean)
    if (!isNaN(time) && time >= 0 && time < 24) {
      const hours = Math.floor(time)
      const minutes = Math.round((time - hours) * 60)
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
    
    return 'N/A'
  }

  // Redirect to routine setup if user has no routine
  if (!routineLoading && (routineError || !routineData?.routine)) {
    return <Navigate to="/routine" replace />
  }

  // Redirect to subjects if routine exists but no subjects added
  const subjects = syllabusData?.syllabuses || []
  if (!syllabusLoading && routineData?.routine && subjects.length === 0) {
    return <Navigate to="/syllabus" replace />
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-bold">
            Good {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        {user && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card-glass px-4 py-3 text-right hidden md:block"
          >
            <div className="text-xs text-muted-foreground">Level {user.level} · {getLevelTitle(user.level)}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full" style={{ width: `${xpProgress}%` }} />
              </div>
              <span className="xp-badge"><Zap size={11} />{user.xp}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* AI Advice Banner */}
      {adviceData?.advice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass p-4 border-l-4 border-primary bg-primary/5 flex items-start gap-3"
        >
          <Brain className="text-primary shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-xs font-semibold text-primary mb-1">AI Study Coach</p>
            <p className="text-sm text-muted-foreground">{adviceData.advice}</p>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Zap} label="Total XP" value={user?.xp || 0} sub={`Level ${user?.level}`} color="yellow" />
        <StatCard icon={Flame} label="Streak" value={`${user?.streak || 0} days`} sub="Keep it up!" color="orange" />
        <StatCard icon={CheckSquare} label="Tasks Done" value={user?.tasksCompleted || 0} sub="All time" color="green" />
        <StatCard icon={Clock} label="Study Hours" value={`${Math.round(user?.totalStudyHours || 0)}h`} sub="Total" color="blue" />
        <StatCard icon={Trophy} label="Completion" value={`${stats?.completionRate || 0}%`} sub="This week" color="purple" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Today's Tasks & Weekly Schedule - Unified */}
        <div className="card-glass p-5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-primary" />
              <h2 className="font-semibold">Today's Tasks & Schedule</h2>
            </div>
            <div className="text-sm text-muted-foreground">
              {completedToday}/{totalToday} done
              {totalToday > 0 && (
                <div className="inline-block ml-2 w-16 h-1.5 bg-secondary rounded-full overflow-hidden align-middle">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(completedToday / totalToday) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Main Content Layout */}
          <div className={cn('grid gap-6', todayTasks.length > 0 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1')}>
            {/* Tasks List - Show only if there are tasks */}
            {todayTasks.length > 0 && (
              <div className="lg:col-span-2">
                <h3 className="text-sm font-semibold mb-3">Tasks</h3>
                {loadingToday ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-secondary/50 rounded-lg animate-pulse" />)}</div>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {todayTasks.map((task: {
                      id: string; title: string; subject: string; type: string;
                      priority: string; status: string; estimatedHours: number; scheduledStart?: string; xpReward: number
                    }) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-all group',
                          task.status === 'COMPLETED' ? 'opacity-60' : 'hover:bg-secondary/30'
                        )}
                      >
                        <span className="text-lg">{getTaskTypeIcon(task.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium truncate', task.status === 'COMPLETED' && 'line-through text-muted-foreground')}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{task.subject}</span>
                            {task.scheduledStart && <span className="text-xs text-muted-foreground">· {task.scheduledStart}</span>}
                            <span className={cn('text-xs px-1.5 py-0.5 rounded-full', getPriorityColor(task.priority))}>{task.priority}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="xp-badge text-xs">+{task.xpReward}</span>
                          {task.status !== 'COMPLETED' && (
                            <>
                              <button
                                onClick={() => startSessionMutation.mutate({ subject: task.subject, taskId: task.id })}
                                className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400 transition-colors"
                                title="Start session"
                              >
                                <Play size={13} />
                              </button>
                              <button
                                onClick={() => completeMutation.mutate(task.id)}
                                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                title="Mark complete"
                              >
                                <CheckSquare size={13} />
                              </button>
                            </>
                          )}
                        </div>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(task.status))}>
                          {task.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Link to="/syllabus" className="flex-1 text-center text-sm text-primary hover:underline py-1">
                    View all subjects
                  </Link>
                </div>
              </div>
            )}

            {/* Weekly Schedule - Horizontal Calendar */}
            <div className={cn(todayTasks.length > 0 ? 'col-span-1' : 'col-span-full')}>
              <h3 className="text-sm font-semibold mb-3">
                {todayTasks.length > 0 ? 'Your Week' : 'Weekly Schedule'}
              </h3>
              
              {allEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto mb-2 opacity-30" size={32} />
                  <p className="text-sm">No schedule created yet</p>
                  <Link to="/timetable" className="text-primary text-sm hover:underline mt-1 inline-block">
                    Generate your timetable →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Day Selector */}
                  <div className="grid grid-cols-7 gap-2 pb-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                      const date = new Date()
                      date.setDate(date.getDate() + dayOffset)
                      const dayName = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' })
                      const dayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      const isSelected = selectedDayOffset === dayOffset
                      
                      return (
                        <button
                          key={dayOffset}
                          onClick={() => setSelectedDayOffset(dayOffset)}
                          className={cn(
                            'flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border transition-all text-xs',
                            isSelected
                              ? 'border-primary/50 bg-primary/10 text-foreground font-semibold'
                              : 'border-border/50 hover:border-border/80 text-muted-foreground'
                          )}
                        >
                          <span className="font-medium text-sm">{dayName}</span>
                          <span className="text-xs">{dayDate}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Horizontal Time Slots for Selected Day */}
                  <div className="border-t border-border/30 pt-6">
                    {selectedDayEntries.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Calendar className="mx-auto mb-3 opacity-20" size={40} />
                        <p className="text-sm">No slots for this day</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto pb-4">
                        <div className="flex gap-4 min-w-min">
                          {selectedDayEntries.map((entry: {
                            id: string; startTime: string; endTime: string; label: string; subject?: string; isCompleted: boolean
                          }) => (
                            <motion.div
                              key={entry.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ scale: 1.03, translateY: -5 }}
                              className={cn(
                                'flex flex-col min-w-56 p-4 rounded-xl border-2 transition-all shadow-md hover:shadow-lg',
                                entry.isCompleted
                                  ? 'border-green-500/50 bg-gradient-to-br from-green-500/15 to-green-600/5'
                                  : 'border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 hover:border-primary/70'
                              )}
                            >
                              <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex-1">
                                  <p className="font-mono font-bold text-primary text-lg">
                                    {formatTime(entry.startTime)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    to {formatTime(entry.endTime)}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    completeEntryMutation.mutate(entry.id)
                                  }}
                                  disabled={completeEntryMutation.isPending}
                                  className={cn(
                                    'flex-shrink-0 p-2 rounded-lg transition-all',
                                    entry.isCompleted
                                      ? 'bg-green-500/40 hover:bg-green-500/60'
                                      : 'bg-border/30 hover:bg-border/50'
                                  )}
                                >
                                  <CheckSquare 
                                    size={20} 
                                    className={entry.isCompleted ? 'text-green-400' : 'text-muted-foreground'}
                                  />
                                </button>
                              </div>
                              <div className="flex-1">
                                <p className={cn(
                                  'text-base font-bold leading-tight mb-2',
                                  entry.isCompleted && 'line-through opacity-70'
                                )}>
                                  {entry.label}
                                </p>
                                {entry.subject && (
                                  <div className="inline-block bg-secondary/60 px-3 py-1 rounded-full">
                                    <p className="text-xs text-muted-foreground font-medium">
                                      {entry.subject}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Empty state when no tasks */}
          {todayTasks.length === 0 && !loadingToday && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm mb-3">No tasks scheduled for today</p>
              <Link to="/syllabus" className="text-primary text-sm hover:underline inline-block">
                Add subjects to generate tasks →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Delayed tasks alert */}
      {stats?.completionRate < 70 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-glass p-4 border-l-4 border-yellow-500 bg-yellow-500/5 flex items-center gap-3"
        >
          <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Your completion rate is below 70%</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review your routine and adjust task estimates. Consider regenerating your timetable.
            </p>
          </div>
          <Link to="/syllabus" className="text-sm text-yellow-400 hover:underline shrink-0">Review →</Link>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: 'Manage Subjects', to: '/syllabus', color: 'bg-purple-500/10 text-purple-400' },
          { icon: Trophy, label: 'Leaderboard', to: '/leaderboard', color: 'bg-yellow-500/10 text-yellow-400' },
          { icon: BarChart2, label: 'Analytics', to: '/analytics', color: 'bg-green-500/10 text-green-400' },
        ].map(({ icon: Icon, label, to, color }) => (
          <Link
            key={to}
            to={to}
            className={cn('card-glass p-4 flex flex-col items-center gap-2.5 hover:scale-105 transition-all text-center', color)}
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}
