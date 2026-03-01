import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { timetableApi } from '../lib/api'
import { Brain, Loader2, Calendar, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, DAY_NAMES } from '../lib/utils'
import { format, addDays, startOfWeek } from 'date-fns'

const TYPE_COLORS: Record<string, string> = {
  STUDY: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
  REVISION: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
  ASSIGNMENT: 'bg-orange-500/20 border-orange-500/30 text-orange-300',
  PROJECT: 'bg-green-500/20 border-green-500/30 text-green-300',
  EXAM_PREP: 'bg-red-500/20 border-red-500/30 text-red-300',
  PRACTICE: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300',
  BREAK: 'bg-gray-500/20 border-gray-500/30 text-gray-400',
}

export default function Timetable() {
  const qc = useQueryClient()
  const [view, setView] = useState<'week' | 'today'>('week')

  const { data, isLoading, error } = useQuery({
    queryKey: ['timetable-current'],
    queryFn: timetableApi.getCurrent,
  })

  const { data: todayData } = useQuery({
    queryKey: ['timetable-today'],
    queryFn: timetableApi.getToday,
  })

  const generateMutation = useMutation({
    mutationFn: timetableApi.generate,
    onSuccess: () => {
      toast.success('AI Timetable generated! 🎉')
      qc.invalidateQueries({ queryKey: ['timetable-current'] })
      qc.invalidateQueries({ queryKey: ['timetable-today'] })
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err?.response?.data?.error || 'Failed to generate timetable')
    },
  })

  const completeMutation = useMutation({
    mutationFn: timetableApi.completeEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable-current'] })
      qc.invalidateQueries({ queryKey: ['timetable-today'] })
    },
  })

  const timetable = data?.timetable
  const entries = timetable?.entries || []

  // Group entries by day
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => ({
    day: (i + 1) % 7,
    date: addDays(weekStart, i),
    name: DAY_NAMES[(i + 1) % 7],
  }))

  const entriesByDay = (day: number) =>
    entries.filter((e: { day: number }) => e.day === day).sort(
      (a: { startTime: string }, b: { startTime: string }) => a.startTime.localeCompare(b.startTime)
    )

  const today = new Date()
  const todayEntries = todayData?.entries || []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-primary" size={24} />
            AI Timetable
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your personalized study schedule powered by GPT-4o
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-secondary rounded-lg p-1">
            <button onClick={() => setView('today')} className={cn('px-3 py-1.5 rounded text-sm font-medium transition-all', view === 'today' ? 'bg-primary text-white' : 'text-muted-foreground')}>Today</button>
            <button onClick={() => setView('week')} className={cn('px-3 py-1.5 rounded text-sm font-medium transition-all', view === 'week' ? 'bg-primary text-white' : 'text-muted-foreground')}>Week</button>
          </div>

          <button
            onClick={() => generateMutation.mutate(undefined)}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60"
          >
            {generateMutation.isPending ? (
              <><Loader2 size={15} className="animate-spin" /> Generating...</>
            ) : (
              <><Brain size={15} /> Generate AI Timetable</>
            )}
          </button>
        </div>
      </div>

      {/* Loading / No timetable */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => <div key={i} className="h-64 bg-secondary/50 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && !timetable && !error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass p-14 text-center"
        >
          <Brain size={48} className="mx-auto mb-4 text-primary opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No Timetable Yet</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Add your tasks and let our AI generate an optimized study schedule based on your routine, priorities, and due dates.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => generateMutation.mutate(undefined)}
              disabled={generateMutation.isPending}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-medium"
            >
              {generateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              Generate My Timetable
            </button>
          </div>
        </motion.div>
      )}

      {/* Today view */}
      {view === 'today' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">
            {format(today, 'EEEE, MMMM d')}
          </h2>
          {todayEntries.length === 0 ? (
            <div className="card-glass p-10 text-center text-muted-foreground">
              <Clock className="mx-auto mb-2 opacity-30" size={32} />
              <p>No scheduled activity for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayEntries.map((entry: {
                id: string; startTime: string; endTime: string; label: string;
                type: string; subject?: string; isCompleted: boolean; isDelayed: boolean
              }) => (
                <TimetableEntry key={entry.id} entry={entry} onComplete={completeMutation.mutate} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Week view */}
      {view === 'week' && timetable && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map(({ day, date, name }) => {
            const dayEntries = entriesByDay(day)
            const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

            return (
              <div key={day} className={cn('card-glass rounded-xl overflow-hidden', isToday && 'ring-2 ring-primary/50')}>
                <div className={cn('px-3 py-2.5 text-center', isToday ? 'bg-primary/20' : 'bg-secondary/50')}>
                  <p className={cn('text-xs font-semibold', isToday ? 'text-primary' : 'text-muted-foreground')}>{name}</p>
                  <p className={cn('text-base font-bold mt-0.5', isToday ? 'text-primary' : '')}>{format(date, 'd')}</p>
                </div>
                <div className="p-2 space-y-1.5 min-h-[120px]">
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground/40 text-center pt-4">Free day</p>
                  ) : dayEntries.slice(0, 5).map((entry: {
                    id: string; startTime: string; endTime: string; label: string;
                    type: string; subject?: string; isCompleted: boolean
                  }) => (
                    <div
                      key={entry.id}
                      className={cn(
                        'px-2 py-1.5 rounded-md border text-xs transition-all cursor-pointer',
                        TYPE_COLORS[entry.type] || TYPE_COLORS.STUDY,
                        entry.isCompleted && 'opacity-40 line-through'
                      )}
                      onClick={() => !entry.isCompleted && completeMutation.mutate(entry.id)}
                    >
                      <div className="font-medium truncate">{entry.label}</div>
                      <div className="opacity-70 mt-0.5">{entry.startTime}–{entry.endTime}</div>
                    </div>
                  ))}
                  {dayEntries.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">+{dayEntries.length - 5} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(TYPE_COLORS).map(([type, cls]) => (
          <span key={type} className={cn('px-2 py-1 rounded-md border', cls)}>
            {type.replace('_', ' ')}
          </span>
        ))}
      </div>
    </div>
  )
}

function TimetableEntry({ entry, onComplete }: {
  entry: { id: string; startTime: string; endTime: string; label: string; type: string; subject?: string; isCompleted: boolean; isDelayed: boolean }
  onComplete: (id: string) => void
}) {
  const now = new Date()
  const [h, m] = entry.startTime.split(':').map(Number)
  const entryTime = new Date(); entryTime.setHours(h, m, 0)
  const isPast = now > entryTime
  const isCurrent = isPast && !entry.isCompleted

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border transition-all',
        entry.isCompleted ? 'opacity-50 bg-secondary/20 border-border/30' :
        isCurrent ? 'bg-primary/5 border-primary/30 glow-blue' :
        'card-glass',
        entry.isDelayed && 'border-red-500/30 bg-red-500/5'
      )}
    >
      <div className="text-right w-16 shrink-0">
        <p className="text-sm font-mono font-medium">{entry.startTime}</p>
        <p className="text-xs text-muted-foreground">{entry.endTime}</p>
      </div>
      <div className={cn('w-1 h-10 rounded-full', TYPE_COLORS[entry.type]?.split(' ')[0]?.replace('bg-', 'bg-') || 'bg-primary/50')} />
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-sm', entry.isCompleted && 'line-through')}>{entry.label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.subject && <span className="text-xs text-muted-foreground">{entry.subject}</span>}
          <span className={cn('text-xs px-1.5 py-0.5 rounded border', TYPE_COLORS[entry.type] || TYPE_COLORS.STUDY)}>
            {entry.type.replace('_', ' ')}
          </span>
          {entry.isDelayed && <span className="text-xs text-red-400">Delayed</span>}
          {isCurrent && <span className="text-xs text-primary animate-pulse">Now</span>}
        </div>
      </div>
      {!entry.isCompleted ? (
        <button
          onClick={() => onComplete(entry.id)}
          className="p-2 rounded-lg hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors"
          title="Mark complete"
        >
          <CheckCircle size={18} />
        </button>
      ) : (
        <CheckCircle size={18} className="text-green-400 shrink-0" />
      )}
    </motion.div>
  )
}
