import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { syllabusApi, timetableApi } from '../lib/api'
import { BookOpen, Plus, Trash2, Brain, Loader2, Sparkles, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

interface Subject {
  id: string
  subject: string
  targetDays: number
  createdAt: string
}

export default function Syllabus() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [days, setDays] = useState(30)

  const { data, isLoading } = useQuery({ queryKey: ['syllabuses'], queryFn: syllabusApi.getAll })

  const addMutation = useMutation({
    mutationFn: syllabusApi.addSubject,
    onSuccess: (d) => {
      toast.success(d.message)
      qc.invalidateQueries({ queryKey: ['syllabuses'] })
      setName('')
      setDays(30)
    },
    onError: () => toast.error('Failed to add subject'),
  })

  const deleteMutation = useMutation({
    mutationFn: syllabusApi.deleteSubject,
    onSuccess: () => {
      toast.success('Subject removed')
      qc.invalidateQueries({ queryKey: ['syllabuses'] })
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => timetableApi.generate(),
    onSuccess: () => {
      toast.success('AI Timetable generated! Check the Timetable page 🎉')
      qc.invalidateQueries({ queryKey: ['timetable-today'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to generate timetable'),
  })

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) { toast.error('Enter a subject name'); return }
    if (days < 1) { toast.error('Days must be at least 1'); return }
    addMutation.mutate({ subject: trimmed, targetDays: days })
  }

  const subjects: Subject[] = data?.syllabuses || []

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 via-blue-500/20 to-cyan-500/20 border border-white/[0.06]"
            style={{ boxShadow: '0 0 20px rgba(139,92,246,0.15)' }}>
            <BookOpen className="text-violet-400" size={22} />
          </div>
          <span className="bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
            Subjects
          </span>
        </h1>
        <p className="text-muted-foreground/60 text-xs mt-1.5 ml-[52px]">
          Add what you want to study and how many days you need. Then generate an AI timetable.
        </p>
      </motion.div>

      {/* Add Subject Form */}
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="card-glass p-4 border border-white/[0.06]">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Subject name — e.g. Data Structures, Linear Algebra..."
            className="flex-1 bg-secondary/80 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 placeholder:text-muted-foreground/40"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-secondary/80 border border-border/50 rounded-xl px-3 py-3">
              <Calendar size={14} className="text-muted-foreground/50 shrink-0" />
              <input
                type="number" min="1" max="365" value={days}
                onChange={e => setDays(parseInt(e.target.value) || 1)}
                className="w-10 bg-transparent text-sm text-center font-medium focus:outline-none"
              />
              <span className="text-[11px] text-muted-foreground/50 shrink-0">days</span>
            </div>
            <button
              onClick={handleAdd}
              disabled={addMutation.isPending || !name.trim()}
              className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all shrink-0"
              style={{ boxShadow: '0 3px 14px rgba(139,92,246,0.2)' }}
            >
              {addMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add
            </button>
          </div>
        </div>
      </motion.div>

      {/* Subject List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary/30 rounded-2xl animate-pulse" />)}
        </div>
      ) : subjects.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card-glass p-16 text-center">
          <BookOpen size={40} className="mx-auto mb-3 text-muted-foreground opacity-20" />
          <h2 className="text-base font-semibold mb-1.5">No Subjects Yet</h2>
          <p className="text-sm text-muted-foreground/50 max-w-xs mx-auto">
            Type a subject above and set how many days you want to cover it in.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {subjects.map((s, i) => {
              const colors = [
                'border-violet-500/20 bg-violet-500/[0.04]',
                'border-blue-500/20 bg-blue-500/[0.04]',
                'border-cyan-500/20 bg-cyan-500/[0.04]',
                'border-emerald-500/20 bg-emerald-500/[0.04]',
                'border-amber-500/20 bg-amber-500/[0.04]',
                'border-pink-500/20 bg-pink-500/[0.04]',
              ]
              const accents = ['text-violet-400', 'text-blue-400', 'text-cyan-400', 'text-emerald-400', 'text-amber-400', 'text-pink-400']
              const hash = s.subject.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
              const ci = hash % colors.length

              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${colors[ci]} transition-all group`}
                >
                  <div className={`p-2 rounded-lg bg-white/[0.04] ${accents[ci]}`}>
                    <BookOpen size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.subject}</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                      {s.targetDays || 30} days • added {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Remove "${s.subject}"?`)) deleteMutation.mutate(s.id) }}
                    className="p-2 rounded-lg text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Generate AI Timetable */}
      {subjects.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="card-glass p-5 bg-gradient-to-r from-violet-500/[0.04] via-blue-500/[0.04] to-transparent border-violet-500/10">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/15 to-blue-500/15 border border-white/[0.06] shrink-0">
              <Brain size={20} className="text-violet-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Generate AI Timetable</h3>
              <p className="text-xs text-muted-foreground/50 mb-3">
                AI will create a weekly study schedule distributing your {subjects.length} subject{subjects.length > 1 ? 's' : ''} across the week based on your routine and target days.
              </p>
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 hover:from-violet-500 hover:via-blue-500 hover:to-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                style={{ boxShadow: '0 4px 20px rgba(139,92,246,0.25)' }}
              >
                {generateMutation.isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles size={14} /> Generate Timetable</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
