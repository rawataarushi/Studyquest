import { useQuery } from '@tanstack/react-query'
import { usersApi, sessionsApi } from '../lib/api'
import { useAuthStore } from '../store'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { BarChart2, Flame, Clock, CheckSquare, TrendingUp, Loader2, Zap } from 'lucide-react'
import { formatDuration } from '../lib/utils'

const COLORS = ['#6d28d9', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#65a30d']

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary' }: any) {
  return (
    <div className="card-glass p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const user = useAuthStore(s => s.user)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats', 'monthly'],
    queryFn: () => usersApi.getStats('monthly'),
  })
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.getAll,
  })

  const isLoading = statsLoading || sessionsLoading

  // build last-14-days study hours from sessions
  const sessionsByDay: Record<string, number> = {}
  const sessions: any[] = sessionsData?.sessions || []
  sessions.forEach((s: any) => {
    if (!s.endTime) return
    const day = new Date(s.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    sessionsByDay[day] = (sessionsByDay[day] || 0) + Math.round((s.duration || 0) / 60)
  })
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 13 + i)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { date: label, minutes: sessionsByDay[label] || 0, hours: Math.round((sessionsByDay[label] || 0) / 60 * 10) / 10 }
  })

  const weeklyData: any[] = stats?.weekly || []
  const subjectData: any[] = stats?.bySubject || []
  const taskTypeData: any[] = stats?.taskTypes || []

  const totalSessions = sessions.length
  const totalMinutes = sessions.reduce((a: number, s: any) => a + (s.duration || 0), 0)
  const avgSession = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0
  const longestSession = sessions.reduce((m: number, s: any) => Math.max(m, s.duration || 0), 0)

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayCounts: Record<string, number> = {}
  sessions.forEach((s: any) => {
    const day = days[new Date(s.startTime).getDay()]
    dayCounts[day] = (dayCounts[day] || 0) + 1
  })
  const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 size={28} className="animate-spin text-primary" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="text-primary" size={24} /> Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Track your study performance and understand your patterns</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Total Study Time" value={formatDuration(totalMinutes)} color="text-blue-400" />
        <StatCard icon={CheckSquare} label="Tasks Completed" value={stats?.totalCompleted ?? user?.tasksCompleted ?? 0} color="text-green-400" />
        <StatCard icon={Flame} label="Current Streak" value={`${user?.streak ?? 0}d`} color="text-orange-400" />
        <StatCard icon={Zap} label="Total XP" value={(user?.xp ?? 0).toLocaleString()} sub={`Level ${user?.level ?? 1}`} color="text-yellow-400" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Avg Session" value={formatDuration(avgSession)} color="text-purple-400" />
        <StatCard icon={TrendingUp} label="Longest Session" value={formatDuration(longestSession)} color="text-pink-400" />
        <StatCard icon={CheckSquare} label="Total Sessions" value={totalSessions} color="text-cyan-400" />
        <StatCard icon={Flame} label="Most Productive Day" value={bestDay} color="text-red-400" />
      </div>

      {/* Study hours trend */}
      <div className="card-glass p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> Study Hours (Last 14 Days)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={last14} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6d28d9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6d28d9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} />
            <YAxis tick={{ fontSize: 11, fill: '#888' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="hours" name="Hours" stroke="#6d28d9" fill="url(#colorHours)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly tasks */}
        {weeklyData.length > 0 && (
          <div className="card-glass p-5">
            <h2 className="font-semibold mb-4">Weekly Task Completions</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="completed" name="Completed" fill="#6d28d9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Task type distribution */}
        {taskTypeData.length > 0 ? (
          <div className="card-glass p-5">
            <h2 className="font-semibold mb-4">Task Type Breakdown</h2>
            <div className="flex items-center">
              <ResponsiveContainer width="60%" height={180}>
                <PieChart>
                  <Pie data={taskTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    dataKey="value" nameKey="name" paddingAngle={2}>
                    {taskTypeData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {taskTypeData.map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{t.name}</span>
                    <span className="ml-auto font-medium">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : weeklyData.length === 0 ? (
          <div className="card-glass p-5 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Complete tasks to see breakdowns</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Subject breakdown */}
      {subjectData.length > 0 && (
        <div className="card-glass p-5">
          <h2 className="font-semibold mb-4">Study Time by Subject</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={subjectData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis type="category" dataKey="subject" tick={{ fontSize: 11, fill: '#888' }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hours" name="Hours" radius={[0,4,4,0]}>
                {subjectData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Day of week heatmap */}
      {totalSessions > 0 && (
        <div className="card-glass p-5">
          <h2 className="font-semibold mb-4">Activity by Day of Week</h2>
          <div className="flex gap-2">
            {days.map(day => {
              const count = dayCounts[day] || 0
              const max = Math.max(...Object.values(dayCounts), 1)
              const opacity = count === 0 ? 0.05 : 0.2 + (count / max) * 0.8
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full aspect-square rounded-lg" style={{ backgroundColor: `rgba(109, 40, 217, ${opacity})`, minHeight: 40 }} />
                  <span className="text-xs text-muted-foreground">{day}</span>
                  <span className="text-xs font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
