import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { routinesApi } from '../../lib/api'
import {
  Sun, Moon, Sunrise, Coffee, Brain, Zap, Clock, ChevronRight, ChevronLeft,
  BookOpen, Plus, X, Loader2, Sparkles, Target, Dumbbell, Timer
} from 'lucide-react'
import toast from 'react-hot-toast'

// ---- Types ----
type Chronotype = 'early_bird' | 'night_owl' | 'flexible'
type FocusDuration = 'short' | 'medium' | 'long'
type StudyStyle = 'intense' | 'balanced' | 'relaxed'
type PeakEnergy = 'morning' | 'afternoon' | 'evening'
type BreakPref = 'frequent' | 'moderate' | 'rare'
type ExerciseTime = 'morning' | 'evening' | 'none'
type Priority = 'high' | 'medium' | 'low'

interface Subject {
  name: string
  deadline: string
  priority: Priority
}

// ---- Option Card ----
function OptionCard({ selected, onClick, icon: Icon, label, description, color }: {
  selected: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  description: string
  color: string
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; glow: string; hex: string }> = {
    amber:   { bg: 'from-amber-500/15 to-amber-600/5',   border: 'border-amber-400/50',   text: 'text-amber-300',   glow: 'shadow-amber-500/20',   hex: '#fbbf24' },
    violet:  { bg: 'from-violet-500/15 to-violet-600/5',  border: 'border-violet-400/50',  text: 'text-violet-300',  glow: 'shadow-violet-500/20',  hex: '#a78bfa' },
    blue:    { bg: 'from-blue-500/15 to-blue-600/5',    border: 'border-blue-400/50',    text: 'text-blue-300',    glow: 'shadow-blue-500/20',    hex: '#60a5fa' },
    cyan:    { bg: 'from-cyan-500/15 to-cyan-600/5',    border: 'border-cyan-400/50',    text: 'text-cyan-300',    glow: 'shadow-cyan-500/20',    hex: '#22d3ee' },
    emerald: { bg: 'from-emerald-500/15 to-emerald-600/5', border: 'border-emerald-400/50', text: 'text-emerald-300', glow: 'shadow-emerald-500/20', hex: '#34d399' },
    orange:  { bg: 'from-orange-500/15 to-orange-600/5',  border: 'border-orange-400/50',  text: 'text-orange-300',  glow: 'shadow-orange-500/20',  hex: '#fb923c' },
    pink:    { bg: 'from-pink-500/15 to-pink-600/5',    border: 'border-pink-400/50',    text: 'text-pink-300',    glow: 'shadow-pink-500/20',    hex: '#f472b6' },
    green:   { bg: 'from-green-500/15 to-green-600/5',   border: 'border-green-400/50',   text: 'text-green-300',   glow: 'shadow-green-500/20',   hex: '#4ade80' },
    red:     { bg: 'from-red-500/15 to-red-600/5',     border: 'border-red-400/50',     text: 'text-red-300',     glow: 'shadow-red-500/20',     hex: '#f87171' },
    indigo:  { bg: 'from-indigo-500/15 to-indigo-600/5',  border: 'border-indigo-400/50',  text: 'text-indigo-300',  glow: 'shadow-indigo-500/20',  hex: '#818cf8' },
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative w-full text-left p-4 rounded-2xl border transition-all duration-200 overflow-hidden
        ${selected
          ? `bg-gradient-to-br ${c.bg} ${c.border} shadow-lg ${c.glow}`
          : 'bg-card/50 border-white/[0.06] hover:border-white/[0.12] hover:bg-card/80'}`}
    >
      {selected && (
        <div className="absolute inset-0 opacity-10"
          style={{ background: `radial-gradient(circle at 20% 50%, ${c.hex}, transparent 60%)` }} />
      )}
      <div className="relative flex items-start gap-3">
        <div className={`p-2 rounded-xl ${selected ? `bg-white/10` : 'bg-secondary/50'} transition-colors`}>
          <Icon size={18} className={selected ? c.text : 'text-muted-foreground'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${selected ? 'text-foreground' : 'text-muted-foreground'} transition-colors`}>
            {label}
          </div>
          <div className="text-[11px] text-muted-foreground/60 mt-0.5 leading-relaxed">
            {description}
          </div>
        </div>
        {selected && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5`}
            style={{ background: c.hex }}>
            <span className="text-[10px] text-white font-bold">✓</span>
          </motion.div>
        )}
      </div>
    </motion.button>
  )
}

// ---- Step Components ----
const STEPS = ['Chronotype', 'Focus', 'Energy', 'Lifestyle', 'Subjects']

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)

  // Quiz answers
  const [chronotype, setChronotype] = useState<Chronotype | null>(null)
  const [focusDuration, setFocusDuration] = useState<FocusDuration | null>(null)
  const [studyStyle, setStudyStyle] = useState<StudyStyle | null>(null)
  const [peakEnergy, setPeakEnergy] = useState<PeakEnergy | null>(null)
  const [breakPref, setBreakPref] = useState<BreakPref | null>(null)
  const [exerciseTime, setExerciseTime] = useState<ExerciseTime | null>(null)

  // Subjects
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [newSubject, setNewSubject] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('medium')

  const generateMutation = useMutation({
    mutationFn: routinesApi.generate,
    onSuccess: () => {
      toast.success('Your personalized routine is ready! 🎉')
      queryClient.invalidateQueries({ queryKey: ['routine'] })
      onComplete()
    },
    onError: () => toast.error('Failed to generate routine. You can still set it up manually.'),
  })

  const addSubject = () => {
    const name = newSubject.trim()
    if (!name) return
    if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Subject already added')
      return
    }
    setSubjects(prev => [...prev, { name, deadline: newDeadline, priority: newPriority }])
    setNewSubject('')
    setNewDeadline('')
    setNewPriority('medium')
  }

  const removeSubject = (idx: number) => {
    setSubjects(prev => prev.filter((_, i) => i !== idx))
  }

  const canProceed = () => {
    switch (step) {
      case 0: return chronotype !== null
      case 1: return focusDuration !== null && studyStyle !== null
      case 2: return peakEnergy !== null
      case 3: return breakPref !== null  // exerciseTime optional
      case 4: return true // subjects optional
      default: return true
    }
  }

  const handleGenerate = () => {
    generateMutation.mutate({
      chronotype: chronotype || 'flexible',
      focusDuration: focusDuration || 'medium',
      studyStyle: studyStyle || 'balanced',
      peakEnergy: peakEnergy || 'morning',
      breakPreference: breakPref || 'moderate',
      exerciseTime: exerciseTime || 'none',
      subjects,
    } as Record<string, unknown>)
  }

  const handleSkip = () => {
    onComplete()
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 via-blue-500/20 to-cyan-500/20 border border-white/[0.06]"
              style={{ boxShadow: '0 0 20px rgba(139,92,246,0.15)' }}>
              <Brain className="text-violet-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                Let's Build Your Routine
              </h2>
              <p className="text-[11px] text-muted-foreground/60">
                {STEPS[step]} — Step {step + 1} of {STEPS.length}
              </p>
            </div>
          </div>
          <button onClick={handleSkip}
            className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary/50">
            Skip & do manually
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-secondary/50 rounded-full mb-8 overflow-hidden">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
            style={{ boxShadow: '0 0 10px rgba(139,92,246,0.5)' }}
          />
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step 0: Chronotype */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-1">When do you feel most alive?</h3>
                  <p className="text-xs text-muted-foreground/60">Your natural sleep-wake cycle helps us schedule your best study hours.</p>
                </div>
                <div className="grid gap-3">
                  <OptionCard selected={chronotype === 'early_bird'} onClick={() => setChronotype('early_bird')}
                    icon={Sunrise} label="Early Bird" description="I wake up naturally before 7 AM and do my best work in the morning." color="amber" />
                  <OptionCard selected={chronotype === 'night_owl'} onClick={() => setChronotype('night_owl')}
                    icon={Moon} label="Night Owl" description="I come alive after sunset. My brain peaks late at night." color="violet" />
                  <OptionCard selected={chronotype === 'flexible'} onClick={() => setChronotype('flexible')}
                    icon={Sun} label="Flexible" description="I can adapt. I'm productive at different times depending on the day." color="cyan" />
                </div>
              </div>
            )}

            {/* Step 1: Focus & Style */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="mb-4">
                    <h3 className="text-base font-semibold mb-1">How long can you focus without a break?</h3>
                    <p className="text-xs text-muted-foreground/60">Be honest — we'll match your natural attention span.</p>
                  </div>
                  <div className="grid gap-3">
                    <OptionCard selected={focusDuration === 'short'} onClick={() => setFocusDuration('short')}
                      icon={Timer} label="25 minutes (Pomodoro)" description="I focus best in short, intense bursts with frequent breaks." color="pink" />
                    <OptionCard selected={focusDuration === 'medium'} onClick={() => setFocusDuration('medium')}
                      icon={Clock} label="50 minutes" description="I can hold focus for a good chunk but need regular resets." color="blue" />
                    <OptionCard selected={focusDuration === 'long'} onClick={() => setFocusDuration('long')}
                      icon={Brain} label="90 minutes (Deep work)" description="I go into deep flow for long stretches without distraction." color="emerald" />
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <h3 className="text-base font-semibold mb-1">How intense is your study style?</h3>
                    <p className="text-xs text-muted-foreground/60">This controls how packed your schedule will be.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'intense' as StudyStyle, label: 'Intense', desc: '5-6 sessions/day', icon: Zap, color: 'red' },
                      { id: 'balanced' as StudyStyle, label: 'Balanced', desc: '3-4 sessions/day', icon: Target, color: 'blue' },
                      { id: 'relaxed' as StudyStyle, label: 'Relaxed', desc: '2-3 sessions/day', icon: Coffee, color: 'green' },
                    ].map(opt => (
                      <OptionCard key={opt.id} selected={studyStyle === opt.id} onClick={() => setStudyStyle(opt.id)}
                        icon={opt.icon} label={opt.label} description={opt.desc} color={opt.color} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Peak Energy */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-1">When does your brain perform best?</h3>
                  <p className="text-xs text-muted-foreground/60">We'll schedule your hardest subjects during your peak hours.</p>
                </div>
                <div className="grid gap-3">
                  <OptionCard selected={peakEnergy === 'morning'} onClick={() => setPeakEnergy('morning')}
                    icon={Sunrise} label="Morning (6 AM – 12 PM)" description="I'm sharpest right after waking up. Mornings are gold." color="amber" />
                  <OptionCard selected={peakEnergy === 'afternoon'} onClick={() => setPeakEnergy('afternoon')}
                    icon={Sun} label="Afternoon (12 PM – 6 PM)" description="I hit my stride after lunch. Afternoon focus is my thing." color="orange" />
                  <OptionCard selected={peakEnergy === 'evening'} onClick={() => setPeakEnergy('evening')}
                    icon={Moon} label="Evening (6 PM – 12 AM)" description="I get into the zone when the world quiets down." color="indigo" />
                </div>
              </div>
            )}

            {/* Step 3: Lifestyle */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <div className="mb-4">
                    <h3 className="text-base font-semibold mb-1">How often do you need breaks?</h3>
                    <p className="text-xs text-muted-foreground/60">Breaks are scientifically important. We'll pace them right.</p>
                  </div>
                  <div className="grid gap-3">
                    <OptionCard selected={breakPref === 'frequent'} onClick={() => setBreakPref('frequent')}
                      icon={Coffee} label="Frequent (every 25 min)" description="I need regular resets to stay fresh and avoid burnout." color="pink" />
                    <OptionCard selected={breakPref === 'moderate'} onClick={() => setBreakPref('moderate')}
                      icon={Clock} label="Moderate (every 50 min)" description="A break every hour keeps me going strong." color="blue" />
                    <OptionCard selected={breakPref === 'rare'} onClick={() => setBreakPref('rare')}
                      icon={Zap} label="Rare (every 90 min)" description="I go full steam and take longer breaks less often." color="emerald" />
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <h3 className="text-base font-semibold mb-1">Do you exercise?</h3>
                    <p className="text-xs text-muted-foreground/60">Optional — we'll add gym/workout blocks if you do.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'morning' as ExerciseTime, label: 'Morning', icon: Sunrise, color: 'amber' },
                      { id: 'evening' as ExerciseTime, label: 'Evening', icon: Moon, color: 'violet' },
                      { id: 'none' as ExerciseTime, label: 'No gym', icon: Coffee, color: 'blue' },
                    ].map(opt => (
                      <OptionCard key={opt.id} selected={exerciseTime === opt.id} onClick={() => setExerciseTime(opt.id)}
                        icon={opt.icon} label={opt.label} description="" color={opt.color} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Subjects */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="mb-2">
                  <h3 className="text-base font-semibold mb-1">What do you want to study?</h3>
                  <p className="text-xs text-muted-foreground/60">
                    Add subjects or goals (e.g. "Finish DP", "Linear Algebra"). This is optional — AI will suggest a plan.
                  </p>
                </div>

                {/* Subject list */}
                {subjects.length > 0 && (
                  <div className="space-y-2">
                    {subjects.map((s, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 bg-card/60 border border-white/[0.06] rounded-xl px-4 py-3">
                        <BookOpen size={14} className="text-violet-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{s.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full
                              ${s.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                s.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-blue-500/20 text-blue-400'}`}>
                              {s.priority}
                            </span>
                            {s.deadline && (
                              <span className="text-[10px] text-muted-foreground/50">by {s.deadline}</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => removeSubject(i)}
                          className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-400 transition-all">
                          <X size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Add subject form */}
                <div className="bg-card/40 border border-white/[0.06] rounded-2xl p-4 space-y-3">
                  <div className="flex gap-2">
                    <input value={newSubject} onChange={e => setNewSubject(e.target.value)}
                      placeholder="e.g. Finish DP, Linear Algebra, OS..."
                      className="flex-1 bg-secondary/60 border border-white/[0.06] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all placeholder:text-muted-foreground/30"
                      onKeyDown={e => e.key === 'Enter' && addSubject()} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground/50 mb-1 block">Deadline (optional)</label>
                      <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                        className="w-full bg-secondary/60 border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground/50 mb-1 block">Priority</label>
                      <div className="flex gap-1.5">
                        {(['high', 'medium', 'low'] as Priority[]).map(p => (
                          <button key={p} onClick={() => setNewPriority(p)}
                            className={`flex-1 text-[10px] font-medium py-1.5 rounded-lg border transition-all
                              ${newPriority === p
                                ? p === 'high' ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                  : p === 'medium' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                    : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                : 'bg-secondary/40 border-transparent text-muted-foreground/50 hover:border-white/[0.08]'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={addSubject}
                      className="mt-4 p-2 rounded-xl bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-all border border-violet-500/30">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {subjects.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground/40 py-2">
                    No subjects yet — that's okay! AI will generate a general routine.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.04]">
          <button onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm text-muted-foreground/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all px-3 py-2 rounded-xl hover:bg-secondary/50">
            <ChevronLeft size={16} /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 hover:from-violet-500 hover:via-blue-500 hover:to-cyan-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ boxShadow: canProceed() ? '0 4px 20px rgba(139,92,246,0.3)' : 'none' }}>
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 hover:from-violet-500 hover:via-blue-500 hover:to-cyan-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{ boxShadow: '0 4px 20px rgba(139,92,246,0.3)' }}>
              {generateMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate My Routine
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
