import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
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

  // Check if user has a routine — redirect to setup if not
  const { data: routineData, isLoading: routineLoading, isError: routineError } = useQuery({
    queryKey: ['routine'], queryFn: routinesApi.get, retry: false,
  })

  const { data: statsData } = useQuery({ queryKey: ['user-stats'], queryFn: () => usersApi.getStats() })
  const { data: todayData, isLoading: loadingToday } = useQuery({ queryKey: ['today-tasks'], queryFn: tasksApi.getToday })
  const { data: timetableData } = useQuery({ queryKey: ['timetable-today'], queryFn: timetableApi.getToday })
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

  const stats = statsData?.stats
  const todayTasks = todayData?.tasks || []
  const todayEntries = timetableData?.entries || []

  const completedToday = todayTasks.filter((t: { status: string }) => t.status === 'COMPLETED').length
  const totalToday = todayTasks.length

  const xpProgress = user ? Math.round((user.xp % 500) / 5) : 0

  // Redirect to routine setup if user has no routine
  if (!routineLoading && (routineError || !routineData?.routine)) {
    return <Navigate to="/routine" replace />
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
        <StatCard icon={Clock} label="Study Hours" value={`${(user?.totalStudyHours || 0).toFixed(1)}h`} sub="Total" color="blue" />
        <StatCard icon={Trophy} label="Completion" value={`${stats?.completionRate || 0}%`} sub="This week" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 card-glass p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-primary" />
              <h2 className="font-semibold">Today's Tasks</h2>
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

          {loadingToday ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-secondary/50 rounded-lg animate-pulse" />)}</div>
          ) : todayTasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="mx-auto mb-2 opacity-30" size={32} />
              <p className="text-sm">No tasks scheduled for today</p>
              <Link to="/timetable" className="text-primary text-sm hover:underline mt-1 inline-block">
                Generate AI timetable →
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
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
              View all tasks
            </Link>
            <Link to="/timetable" className="text-sm bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded-lg transition-colors">
              📅 AI Generate
            </Link>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* XP Radial */}
          <div className="card-glass p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-yellow-400" />
              <h3 className="font-semibold text-sm">XP Progress</h3>
            </div>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="60%" outerRadius="90%" data={[{ value: xpProgress, fill: '#f59e0b' }]} startAngle={180} endAngle={0}>
                  <RadialBar dataKey="value" background={{ fill: '#1e293b' }}>
                    <Cell fill="#f59e0b" />
                  </RadialBar>
                  <Tooltip formatter={(v) => [`${v}%`, 'Progress']} contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center -mt-2">
              <p className="text-lg font-bold">{user?.xp} XP</p>
              <p className="text-xs text-muted-foreground">Next level: {xpToNextLevel(user?.xp || 0)} XP</p>
            </div>
          </div>

          {/* Today's Timetable */}
          <div className="card-glass p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-primary" />
              <h3 className="font-semibold text-sm">Today's Schedule</h3>
            </div>
            {todayEntries.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-xs">
                <p>No scheduled slots</p>
                <Link to="/timetable" className="text-primary hover:underline">Generate →</Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {todayEntries.slice(0, 6).map((entry: {
                  id: string; startTime: string; endTime: string; label: string; subject?: string; isCompleted: boolean
                }) => (
                  <div key={entry.id} className={cn('flex items-center gap-2 text-xs', entry.isCompleted && 'opacity-50')}>
                    <div className="text-muted-foreground w-14 shrink-0 font-mono">{entry.startTime}</div>
                    <div className="flex-1 min-w-0">
                      <div className={cn('truncate', entry.isCompleted && 'line-through')}>{entry.label}</div>
                    </div>
                    {entry.isCompleted && <span className="text-green-400">✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subject Breakdown */}
          {stats?.subjectBreakdown?.length > 0 && (
            <div className="card-glass p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={16} className="text-purple-400" />
                <h3 className="font-semibold text-sm">Top Subjects</h3>
              </div>
              <div className="space-y-2">
                {stats.subjectBreakdown.slice(0, 4).map((s: { subject: string; _count: number }, i: number) => (
                  <div key={s.subject} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-4">{i + 1}</span>
                    <span className="flex-1 truncate">{s.subject}</span>
                    <span className="text-muted-foreground">{s._count}</span>
                  </div>
                ))}
              </div>
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
          { icon: Brain, label: 'AI Timetable', to: '/timetable', color: 'bg-blue-500/10 text-blue-400' },
          { icon: BookOpen, label: 'Import Syllabus', to: '/syllabus', color: 'bg-purple-500/10 text-purple-400' },
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
