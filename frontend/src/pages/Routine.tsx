import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { routinesApi } from '../lib/api'
import {
  Clock, Save, Loader2, Sun, Moon, Coffee, Copy, Eraser, Plus, X,
  Paintbrush, RotateCcw, Sparkles, TrendingUp, Calendar, Zap, Target, Trophy
} from 'lucide-react'
import toast from 'react-hot-toast'
import OnboardingWizard from '../components/routine/OnboardingWizard'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Brushes — preset categories with bright, vivid colors
const BRUSHES = [
  { id: 'free',    label: 'Free',    icon: '✓',  hex: '#4ade80', color: 'bg-green-400',   fgColor: 'text-green-200',   bgLight: 'bg-green-400/45',   border: 'border-green-400/60',   ring: 'ring-green-400/70',   gradient: 'from-green-400/60 to-emerald-500/40' },
  { id: 'class',   label: 'Class',   icon: '📚', hex: '#60a5fa', color: 'bg-blue-500',    fgColor: 'text-blue-200',    bgLight: 'bg-blue-400/45',    border: 'border-blue-400/60',    ring: 'ring-blue-400/70',    gradient: 'from-blue-400/60 to-indigo-500/40' },
  { id: 'gym',     label: 'Gym',     icon: '💪', hex: '#fb923c', color: 'bg-orange-500',  fgColor: 'text-orange-200',  bgLight: 'bg-orange-400/45',  border: 'border-orange-400/60',  ring: 'ring-orange-400/70',  gradient: 'from-orange-400/60 to-amber-500/40' },
  { id: 'meal',    label: 'Meal',    icon: '🍽️', hex: '#fbbf24', color: 'bg-amber-500',   fgColor: 'text-amber-200',   bgLight: 'bg-amber-400/45',   border: 'border-amber-400/60',   ring: 'ring-amber-400/70',   gradient: 'from-amber-400/60 to-yellow-500/40' },
  { id: 'commute', label: 'Travel',  icon: '🚌', hex: '#22d3ee', color: 'bg-cyan-500',    fgColor: 'text-cyan-200',    bgLight: 'bg-cyan-400/45',    border: 'border-cyan-400/60',    ring: 'ring-cyan-400/70',    gradient: 'from-cyan-400/60 to-sky-500/40' },
  { id: 'work',    label: 'Work',    icon: '💼', hex: '#a78bfa', color: 'bg-violet-500',  fgColor: 'text-violet-200',  bgLight: 'bg-violet-400/45',  border: 'border-violet-400/60',  ring: 'ring-violet-400/70',  gradient: 'from-violet-400/60 to-purple-500/40' },
  { id: 'rest',    label: 'Rest',    icon: '😴', hex: '#818cf8', color: 'bg-indigo-500',  fgColor: 'text-indigo-200',  bgLight: 'bg-indigo-400/45',  border: 'border-indigo-400/60',  ring: 'ring-indigo-400/70',  gradient: 'from-indigo-400/60 to-blue-500/40' },
  { id: 'other',   label: 'Other',   icon: '📌', hex: '#f472b6', color: 'bg-pink-500',    fgColor: 'text-pink-200',    bgLight: 'bg-pink-400/45',    border: 'border-pink-400/60',    ring: 'ring-pink-400/70',    gradient: 'from-pink-400/60 to-rose-500/40' },
]

const getBrush = (id: string) => BRUSHES.find(b => b.id === id) || BRUSHES[0]

// Hex map for inline glow styles
const BRUSH_HEX: Record<string, string> = Object.fromEntries(BRUSHES.map(b => [b.id, b.hex]))

// Grid: 48 half-hour slots per day
function slotToTime(slot: number): string {
  const h = Math.floor(slot / 2)
  const m = slot % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
}
function timeToSlot(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 2 + (m >= 30 ? 1 : 0)
}

// A grid cell value is either null (sleep/unset) or a brush id
type GridData = Record<number, (string | null)[]> // day -> 48 slots

interface FixedBlock {
  day: number; startTime: string; endTime: string; label: string
}

// Convert grid data to fixedBlocks (merge consecutive same-label slots, skip 'free')
function gridToBlocks(grid: GridData): FixedBlock[] {
  const blocks: FixedBlock[] = []
  for (let day = 0; day < 7; day++) {
    const slots = grid[day] || []
    let runStart: number | null = null
    let runLabel: string | null = null
    for (let i = 0; i < 48; i++) {
      const val = slots[i]
      if (val && val !== 'free') {
        if (runLabel === val) continue // extend run
        // Close previous run
        if (runLabel && runStart !== null) {
          blocks.push({ day, startTime: slotToTime(runStart), endTime: slotToTime(i), label: runLabel })
        }
        runStart = i
        runLabel = val
      } else {
        if (runLabel && runStart !== null) {
          blocks.push({ day, startTime: slotToTime(runStart), endTime: slotToTime(i), label: runLabel })
        }
        runStart = null
        runLabel = null
      }
    }
    if (runLabel && runStart !== null) {
      blocks.push({ day, startTime: slotToTime(runStart), endTime: slotToTime(48), label: runLabel })
    }
  }
  return blocks
}

// Convert fixedBlocks back to grid data
function blocksToGrid(blocks: FixedBlock[], wakeSlot: number, sleepSlot: number): GridData {
  const grid: GridData = {}
  for (let day = 0; day < 7; day++) {
    grid[day] = new Array(48).fill(null)
    // Mark awake slots as 'free' by default
    for (let i = wakeSlot; i < sleepSlot; i++) grid[day][i] = 'free'
  }
  // Paint blocks on top
  for (const b of blocks) {
    const start = timeToSlot(b.startTime)
    const end = timeToSlot(b.endTime)
    for (let i = start; i < end; i++) {
      if (grid[b.day]) grid[b.day][i] = b.label
    }
  }
  return grid
}

export default function Routine() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({ queryKey: ['routine'], queryFn: routinesApi.get, retry: false })
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false)

  // Show onboarding when no routine exists AND user hasn't dismissed it
  const needsOnboarding = !isLoading && (isError || !data?.routine) && !dismissedOnboarding

  const [wakeUpTime, setWakeUpTime] = useState('06:00')
  const [sleepTime, setSleepTime] = useState('23:00')
  const [sessionLength, setSessionLength] = useState(90)
  const [breakDuration, setBreakDuration] = useState(15)
  const [studyDays, setStudyDays] = useState(6)

  const [grid, setGrid] = useState<GridData>({})
  const [activeBrush, setActiveBrush] = useState('free')
  const [isDragging, setIsDragging] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [copyMenuDay, setCopyMenuDay] = useState<number | null>(null)
  const [customBrushName, setCustomBrushName] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customBrushes, setCustomBrushes] = useState<string[]>([])
  const gridRef = useRef<HTMLDivElement>(null)

  const wakeSlot = timeToSlot(wakeUpTime)
  const sleepSlot = timeToSlot(sleepTime)

  // Load saved data
  useEffect(() => {
    if (data?.routine) {
      const r = data.routine
      setWakeUpTime(r.wakeUpTime || '06:00')
      setSleepTime(r.sleepTime || '23:00')
      setSessionLength(r.preferredSessionLength || 90)
      setBreakDuration(r.breakDuration || 15)
      setStudyDays(r.studyDaysPerWeek || 6)
      const ws = timeToSlot(r.wakeUpTime || '06:00')
      const ss = timeToSlot(r.sleepTime || '23:00')
      const g = blocksToGrid((r.fixedBlocks as FixedBlock[]) || [], ws, ss)
      setGrid(g)
      // Discover custom brush labels
      const knownIds = new Set(BRUSHES.map(b => b.id))
      const customs = new Set<string>()
      for (const b of ((r.fixedBlocks as FixedBlock[]) || [])) {
        if (!knownIds.has(b.label)) customs.add(b.label)
      }
      setCustomBrushes(Array.from(customs))
    }
  }, [data])

  // Rebuild grid when wake/sleep changes
  useEffect(() => {
    setGrid(prev => {
      const next: GridData = {}
      for (let day = 0; day < 7; day++) {
        next[day] = new Array(48).fill(null)
        for (let i = wakeSlot; i < sleepSlot; i++) {
          next[day][i] = prev[day]?.[i] || 'free'
        }
      }
      return next
    })
  }, [wakeSlot, sleepSlot])

  const saveMutation = useMutation({
    mutationFn: routinesApi.save,
    onSuccess: () => {
      toast.success('Routine saved! 🎉')
      queryClient.invalidateQueries({ queryKey: ['routine'] })
      queryClient.invalidateQueries({ queryKey: ['available-slots'] })
    },
    onError: () => toast.error('Failed to save routine'),
  })

  const handleSave = () => {
    const fixedBlocks = gridToBlocks(grid)
    saveMutation.mutate({
      wakeUpTime,
      sleepTime,
      preferredSessionLength: sessionLength,
      breakDuration,
      studyDaysPerWeek: studyDays,
      fixedBlocks,
    } as Record<string, unknown>)
  }

  // Paint a cell — works on all 48 slots (full day)
  const paintCell = useCallback((day: number, slot: number) => {
    if (slot < 0 || slot >= 48) return
    setGrid(prev => {
      const newGrid = { ...prev }
      newGrid[day] = [...(prev[day] || new Array(48).fill(null))]
      newGrid[day][slot] = activeBrush === 'eraser' ? (slot >= wakeSlot && slot < sleepSlot ? 'free' : null) : activeBrush
      return newGrid
    })
  }, [activeBrush, wakeSlot, sleepSlot])

  const handleMouseDown = (day: number, slot: number) => {
    setIsDragging(true)
    paintCell(day, slot)
  }
  const handleMouseEnter = (day: number, slot: number) => {
    if (isDragging) paintCell(day, slot)
  }
  useEffect(() => {
    const up = () => setIsDragging(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  // Copy day
  const copyDayTo = (from: number, targets: number[]) => {
    setGrid(prev => {
      const next = { ...prev }
      for (const t of targets) next[t] = [...(prev[from] || [])]
      return next
    })
    setCopyMenuDay(null)
    toast.success(`Copied to ${targets.length} day${targets.length > 1 ? 's' : ''}`)
  }

  // Clear day
  const clearDay = (day: number) => {
    setGrid(prev => {
      const next = { ...prev }
      next[day] = new Array(48).fill(null)
      for (let i = wakeSlot; i < sleepSlot; i++) next[day][i] = 'free'
      return next
    })
  }

  // Time labels for the grid header
  const visibleHours: number[] = []
  for (let i = wakeSlot; i < sleepSlot; i += 2) visibleHours.push(i)

  // Add custom brush
  const addCustomBrush = () => {
    const name = customBrushName.trim().toLowerCase()
    if (!name) return
    if (BRUSHES.some(b => b.id === name) || customBrushes.includes(name)) {
      toast.error('Already exists')
      return
    }
    setCustomBrushes(prev => [...prev, name])
    setActiveBrush(name)
    setCustomBrushName('')
    setShowCustomInput(false)
  }

  // Delete custom brush & remove its slots from grid
  const deleteCustomBrush = (name: string) => {
    setCustomBrushes(prev => prev.filter(b => b !== name))
    if (activeBrush === name) setActiveBrush('free')
    setGrid(prev => {
      const next: GridData = {}
      for (let d = 0; d < 7; d++) {
        next[d] = [...(prev[d] || new Array(48).fill(null))]
        for (let s = 0; s < 48; s++) {
          if (next[d][s] === name) {
            next[d][s] = (s >= wakeSlot && s < sleepSlot) ? 'free' : null
          }
        }
      }
      return next
    })
    toast.success(`Removed "${name}"`)
  }

  const allBrushes = [
    ...BRUSHES,
    ...customBrushes.map(name => ({
      id: name,
      label: name.charAt(0).toUpperCase() + name.slice(1),
      icon: '🏷️',
      hex: '#fb7185',
      color: 'bg-rose-500',
      fgColor: 'text-rose-300',
      bgLight: 'bg-rose-400/45',
      border: 'border-rose-400/60',
      ring: 'ring-rose-400/70',
      gradient: 'from-rose-400/60 to-rose-500/40',
    }))
  ]

  const getSlotBrush = (brushId: string) => allBrushes.find(b => b.id === brushId) || allBrushes[0]

  // ---- Gamification Stats ----
  const stats = useMemo(() => {
    const totalAwakeSlots = (sleepSlot - wakeSlot) * 7
    let plannedSlots = 0
    let freeSlots = 0
    const catCounts: Record<string, number> = {}
    const dayCounts: number[] = []

    for (let d = 0; d < 7; d++) {
      let dayPlanned = 0
      for (let s = wakeSlot; s < sleepSlot; s++) {
        const val = grid[d]?.[s]
        if (val && val !== 'free') {
          plannedSlots++
          dayPlanned++
          catCounts[val] = (catCounts[val] || 0) + 1
        }
        if (val === 'free') freeSlots++
      }
      dayCounts.push(dayPlanned)
    }

    const coverage = totalAwakeSlots > 0 ? Math.round((plannedSlots / totalAwakeSlots) * 100) : 0
    const totalPlannedHours = (plannedSlots / 2)
    const busiestDay = dayCounts.indexOf(Math.max(...dayCounts))
    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]

    return { coverage, totalPlannedHours, freeSlots, busiestDay, topCategory, dayCounts, totalAwakeSlots, plannedSlots }
  }, [grid, wakeSlot, sleepSlot])

  // Coverage tier for gamification
  const coverageTier = stats.coverage >= 80 ? { label: 'Master Planner', color: 'text-amber-400', icon: Trophy, glow: 'shadow-amber-500/20' }
    : stats.coverage >= 50 ? { label: 'On Track', color: 'text-emerald-400', icon: TrendingUp, glow: 'shadow-emerald-500/20' }
    : stats.coverage >= 20 ? { label: 'Getting Started', color: 'text-blue-400', icon: Target, glow: 'shadow-blue-500/20' }
    : { label: 'Blank Canvas', color: 'text-muted-foreground', icon: Sparkles, glow: '' }

  // ---- Show onboarding wizard for first-time users ----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-violet-400" />
      </div>
    )
  }

  if (needsOnboarding) {
    return <OnboardingWizard onComplete={() => setDismissedOnboarding(true)} />
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 via-blue-500/20 to-cyan-500/20 border border-white/[0.06]"
              style={{ boxShadow: '0 0 20px rgba(139,92,246,0.15), 0 0 40px rgba(59,130,246,0.08)' }}>
              <Clock className="text-violet-400" size={22} />
            </div>
            <span className="bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Weekly Routine
            </span>
          </h1>
          <p className="text-muted-foreground/70 text-xs mt-1 ml-[52px] flex items-center gap-1.5">
            <Paintbrush size={10} className="text-violet-400/60" />
            Pick a brush and paint your week — drag to fill slots
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground transition-all border
              ${showSettings ? 'bg-secondary border-border/60 text-foreground' : 'bg-secondary/50 border-transparent hover:bg-secondary/80 hover:border-border/40'}`}>
            <Coffee size={13} /> Settings
          </button>
          <button onClick={handleSave} disabled={saveMutation.isPending}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 hover:from-violet-500 hover:via-blue-500 hover:to-cyan-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{ boxShadow: '0 4px 20px rgba(139,92,246,0.25), 0 2px 8px rgba(59,130,246,0.2)' }}>
            {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </motion.div>

      {/* Settings panel (collapsible) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="card-glass p-4 border-violet-500/10">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Sun size={10} className="text-amber-400" /> Wake</label>
                  <input type="time" value={wakeUpTime} onChange={e => setWakeUpTime(e.target.value)}
                    className="w-full bg-secondary/80 border border-border/50 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Moon size={10} className="text-indigo-400" /> Sleep</label>
                  <input type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)}
                    className="w-full bg-secondary/80 border border-border/50 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1">Session: {sessionLength}m</label>
                  <input type="range" min="30" max="180" step="15" value={sessionLength}
                    onChange={e => setSessionLength(parseInt(e.target.value))} className="w-full accent-violet-500" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1">Break: {breakDuration}m</label>
                  <input type="range" min="5" max="60" step="5" value={breakDuration}
                    onChange={e => setBreakDuration(parseInt(e.target.value))} className="w-full accent-violet-500" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1">Study days: {studyDays}/wk</label>
                  <input type="range" min="1" max="7" step="1" value={studyDays}
                    onChange={e => setStudyDays(parseInt(e.target.value))} className="w-full accent-violet-500" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="h-96 bg-secondary/50 rounded-xl animate-pulse" />
      ) : (
        <>
          {/* Gamification Stats Banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Coverage */}
            <div className="card-glass p-3.5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground/80 uppercase tracking-wider font-medium">Coverage</span>
                  <coverageTier.icon size={13} className={coverageTier.color} />
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-bold tabular-nums bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">{stats.coverage}%</span>
                  <span className={`text-[9px] font-medium ${coverageTier.color} mb-1`}>{coverageTier.label}</span>
                </div>
                {/* Mini progress bar */}
                <div className="mt-2 h-1 bg-secondary/80 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.coverage}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                    style={{ boxShadow: '0 0 8px rgba(139,92,246,0.5)' }}
                  />
                </div>
              </div>
            </div>

            {/* Hours Planned */}
            <div className="card-glass p-3.5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.06] to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground/80 uppercase tracking-wider font-medium">Planned</span>
                  <Calendar size={13} className="text-cyan-400" />
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-bold tabular-nums bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">{stats.totalPlannedHours.toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground mb-1">hrs/wk</span>
                </div>
                <div className="mt-2 flex gap-[2px]">
                  {stats.dayCounts.map((c, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end h-3">
                      <div
                        className="rounded-sm bg-gradient-to-t from-cyan-500 to-cyan-400 transition-all duration-500"
                        style={{
                          height: `${Math.max(c > 0 ? 20 : 0, (c / Math.max(...stats.dayCounts, 1)) * 100)}%`,
                          opacity: c > 0 ? 0.7 : 0.15,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Free Time */}
            <div className="card-glass p-3.5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.06] to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground/80 uppercase tracking-wider font-medium">Free Time</span>
                  <Sparkles size={13} className="text-emerald-400" />
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-bold tabular-nums bg-gradient-to-r from-emerald-300 to-green-300 bg-clip-text text-transparent">{(stats.freeSlots / 2).toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground mb-1">hrs free</span>
                </div>
                <div className="mt-2 h-1 bg-secondary/80 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.totalAwakeSlots > 0 ? (stats.freeSlots / stats.totalAwakeSlots) * 100 : 0}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
                    style={{ boxShadow: '0 0 8px rgba(52,211,153,0.4)' }}
                  />
                </div>
              </div>
            </div>

            {/* Top Activity */}
            <div className="card-glass p-3.5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground/80 uppercase tracking-wider font-medium">Top Activity</span>
                  <Zap size={13} className="text-amber-400" />
                </div>
                {stats.topCategory ? (() => {
                  const brush = getSlotBrush(stats.topCategory[0])
                  return (
                    <div className="flex items-end gap-1.5">
                      <span className="text-lg">{brush.icon}</span>
                      <span className="text-lg font-bold bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">{brush.label}</span>
                      <span className="text-[10px] text-muted-foreground mb-0.5">{(stats.topCategory[1] / 2).toFixed(1)}h</span>
                    </div>
                  )
                })() : (
                  <span className="text-sm text-muted-foreground/60">None yet</span>
                )}
                <div className="mt-2 text-[9px] text-muted-foreground/50">
                  Busiest: {DAYS[stats.busiestDay]?.slice(0, 3) || '—'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Brush palette */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="card-glass p-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.03] via-transparent to-cyan-500/[0.03]" />
            <div className="relative flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mr-1 uppercase tracking-wider font-medium">
                <Paintbrush size={11} className="text-violet-400/60" /> Brush
              </span>

              {allBrushes.map(brush => {
                const isActive = activeBrush === brush.id
                const isCustom = customBrushes.includes(brush.id)
                return (
                  <div key={brush.id} className="relative group/brush">
                    <motion.button
                      onClick={() => setActiveBrush(brush.id)}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200
                        ${isActive
                          ? `${brush.fgColor} border ${brush.border}`
                          : 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border/30'}`}
                      style={isActive ? {
                        background: `linear-gradient(135deg, ${brush.hex}40, ${brush.hex}20)`,
                        boxShadow: `0 0 16px ${brush.hex}50, inset 0 0 16px ${brush.hex}18`,
                      } : {
                        background: 'hsl(var(--secondary) / 0.4)',
                      }}>
                      <span className="text-sm">{brush.icon}</span>
                      {brush.label}
                    </motion.button>
                    {isCustom && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCustomBrush(brush.id) }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover/brush:opacity-100 transition-opacity hover:bg-red-400 shadow-lg shadow-red-500/30"
                        title={`Delete ${brush.label}`}>
                        <X size={9} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Eraser */}
              <motion.button
                onClick={() => setActiveBrush('eraser')}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200
                  ${activeBrush === 'eraser'
                    ? 'text-red-400 border border-red-500/40'
                    : 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border/30'}`}
                style={activeBrush === 'eraser' ? {
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))',
                  boxShadow: '0 0 12px rgba(239,68,68,0.15), inset 0 0 12px rgba(239,68,68,0.05)',
                } : {
                  background: 'hsl(var(--secondary) / 0.4)',
                }}>
                <Eraser size={13} /> Erase
              </motion.button>

              <div className="border-l border-border/30 h-5 mx-1" />

              {/* Add custom brush */}
              {showCustomInput ? (
                <div className="flex items-center gap-1">
                  <input value={customBrushName} onChange={e => setCustomBrushName(e.target.value)}
                    placeholder="Name..."
                    className="bg-secondary/80 border border-border/50 rounded-xl px-2.5 py-1 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
                    onKeyDown={e => e.key === 'Enter' && addCustomBrush()}
                    autoFocus />
                  <button onClick={addCustomBrush} className="text-violet-400 hover:text-violet-300 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowCustomInput(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground/70 hover:text-foreground bg-secondary/30 hover:bg-secondary/50 border border-dashed border-border/30 hover:border-border/50 transition-all">
                  <Plus size={12} /> Custom
                </button>
              )}
            </div>
          </motion.div>

          {/* Grid */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="card-glass p-4 overflow-x-auto relative" ref={gridRef}>
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] via-transparent to-cyan-500/[0.02] rounded-xl pointer-events-none" />
            <div className="min-w-[700px] relative">
              {/* Time header */}
              <div className="flex mb-1">
                <div className="w-24 shrink-0" />
                <div className="flex-1 flex">
                  {Array.from({ length: 48 }, (_, i) => {
                    const slot = i
                    const isHour = slot % 2 === 0
                    // Show label every 2 hours to avoid crowding
                    const showLabel = isHour && slot % 4 === 0
                    return (
                      <div key={slot} className="flex-1 text-center" style={{ minWidth: '14px' }}>
                        {showLabel && (
                          <span className="text-[8px] font-mono text-muted-foreground/50 font-medium">
                            {slotToTime(slot).slice(0, 5)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="w-16 shrink-0" />
              </div>

              {/* Day rows */}
              {DAYS.map((day, dayIdx) => {
                const daySlots = sleepSlot - wakeSlot
                const dayPlanned = stats.dayCounts[dayIdx] || 0
                const dayPct = daySlots > 0 ? Math.round((dayPlanned / daySlots) * 100) : 0
                return (
                  <div key={dayIdx} className="flex items-stretch group">
                    {/* Day label */}
                    <div className="w-24 shrink-0 flex items-center gap-2 pr-2">
                      <span className="text-xs font-semibold text-muted-foreground/70 group-hover:text-foreground transition-colors w-8">
                        {day.slice(0, 3)}
                      </span>
                      {/* Mini day coverage bar */}
                      <div className="flex-1 h-1 bg-secondary/50 rounded-full overflow-hidden max-w-[36px]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500/60 to-blue-500/60 transition-all duration-500"
                          style={{ width: `${dayPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Slots — full 24h */}
                    <div className="flex-1 flex rounded-lg overflow-hidden my-[1.5px] border border-white/[0.04]"
                      onMouseLeave={() => {}}>
                      {Array.from({ length: 48 }, (_, i) => {
                        const slot = i
                        const isAwake = slot >= wakeSlot && slot < sleepSlot
                        const val = grid[dayIdx]?.[slot] || null
                        const brush = val ? getSlotBrush(val) : null
                        const isHour = slot % 2 === 0
                        const hex = val && val !== 'free' ? (brush as any)?.hex || '#fb7185' : val === 'free' ? '#4ade80' : undefined

                        return (
                          <div key={slot}
                            onMouseDown={(e) => { e.preventDefault(); handleMouseDown(dayIdx, slot) }}
                            onMouseEnter={() => handleMouseEnter(dayIdx, slot)}
                            className={`flex-1 h-10 transition-all duration-100 cursor-pointer
                              ${isHour ? 'border-l border-white/[0.04]' : ''}
                              ${activeBrush === 'eraser' ? 'hover:!bg-red-500/20' : ''}`}
                            style={{
                              minWidth: '14px',
                              background: val && val !== 'free' && hex
                                ? `linear-gradient(180deg, ${hex}70 0%, ${hex}45 100%)`
                                : val === 'free'
                                  ? 'linear-gradient(180deg, rgba(74,222,128,0.35) 0%, rgba(74,222,128,0.20) 100%)'
                                  : !isAwake
                                    ? 'linear-gradient(180deg, hsl(230 20% 8% / 0.9) 0%, hsl(230 25% 6% / 0.95) 100%)'
                                    : 'hsl(var(--secondary) / 0.2)',
                              boxShadow: val && val !== 'free' && hex
                                ? `inset 0 0 12px ${hex}30`
                                : undefined,
                              opacity: !isAwake && !val ? 0.35 : 1,
                            }}
                            title={`${slotToTime(slot)} — ${!isAwake ? 'sleep' : val || 'free'}`}
                          />
                        )
                      })}
                    </div>

                    {/* Day actions */}
                    <div className="w-16 shrink-0 flex items-center justify-end gap-1 pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative">
                        <button onClick={() => setCopyMenuDay(copyMenuDay === dayIdx ? null : dayIdx)}
                          className="p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground/50 hover:text-foreground transition-all"
                          title="Copy this day">
                          <Copy size={11} />
                        </button>
                        <AnimatePresence>
                          {copyMenuDay === dayIdx && (
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              className="absolute right-0 top-8 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-1.5 shadow-2xl w-36">
                              <button onClick={() => copyDayTo(dayIdx, [0,1,2,3,4,5,6].filter(d => d !== dayIdx))}
                                className="w-full text-left text-[10px] px-2.5 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors font-medium">All days</button>
                              <button onClick={() => copyDayTo(dayIdx, [1,2,3,4,5].filter(d => d !== dayIdx))}
                                className="w-full text-left text-[10px] px-2.5 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors font-medium">Weekdays</button>
                              <button onClick={() => copyDayTo(dayIdx, [0,6].filter(d => d !== dayIdx))}
                                className="w-full text-left text-[10px] px-2.5 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors font-medium">Weekends</button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <button onClick={() => clearDay(dayIdx)}
                        className="p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground/50 hover:text-red-400 transition-all"
                        title="Clear day">
                        <RotateCcw size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-white/[0.04]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10 border border-white/10" />
                <span className="text-[10px] text-muted-foreground/80 font-medium">Sleep</span>
              </div>
              {allBrushes.map(b => {
                let count = 0
                for (let d = 0; d < 7; d++) {
                  for (let s = 0; s < 48; s++) {
                    if (grid[d]?.[s] === b.id) count++
                  }
                }
                if (count === 0 && b.id !== 'free') return null
                const hours = (count / 2).toFixed(1)
                return (
                  <div key={b.id} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full"
                      style={{ background: b.hex, boxShadow: `0 0 6px ${b.hex}40` }} />
                    <span className="text-[10px] text-muted-foreground/80 font-medium">{b.label}</span>
                    <span className="text-[9px] text-muted-foreground/40 tabular-nums">{hours}h</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
