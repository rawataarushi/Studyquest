import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { tasksApi } from '../lib/api'
import { CheckSquare, Plus, Loader2, Filter, Trash2, Play, Clock, AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, getPriorityColor, getStatusColor, getTaskTypeIcon } from '../lib/utils'

const TASK_TYPES = ['STUDY', 'REVISION', 'ASSIGNMENT', 'PROJECT', 'EXAM_PREP', 'PRACTICE']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']

interface Task {
  id: string; title: string; description?: string; subject: string; type: string;
  priority: string; difficulty: string; estimatedHours: number; status: string;
  dueDate?: string; xpReward: number; isRevision: boolean; scheduledDate?: string
}

function TaskForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: '', subject: '', type: 'STUDY', priority: 'MEDIUM',
    difficulty: 'MEDIUM', estimatedHours: 2, dueDate: '', description: '', isRevision: false,
  })

  const mutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => { toast.success('Task added! 🎯'); onSuccess(); onClose(); },
    onError: () => toast.error('Failed to add task'),
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="card-glass w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Add New Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Task Title *</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Chapter 5 – Data Structures"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subject *</label>
              <input
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Data Structures"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Est. Hours *</label>
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={form.estimatedHours}
                onChange={e => setForm({ ...form, estimatedHours: parseFloat(e.target.value) })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                placeholder="Optional notes"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRevision"
              checked={form.isRevision}
              onChange={e => setForm({ ...form, isRevision: e.target.checked, type: e.target.checked ? 'REVISION' : 'STUDY' })}
              className="rounded"
            />
            <label htmlFor="isRevision" className="text-sm">This is a revision task</label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-lg text-sm transition-all">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate(form as Record<string, unknown>)}
            disabled={mutation.isPending || !form.title || !form.subject}
            className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add Task
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Tasks() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<string>('')
  const [subjectFilter, setSubjectFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filter, subjectFilter],
    queryFn: () => tasksApi.getAll({
      ...(filter ? { status: filter } : {}),
      ...(subjectFilter ? { subject: subjectFilter } : {}),
    }),
  })

  const tasks: Task[] = data?.tasks || []

  const completeMutation = useMutation({
    mutationFn: (id: string) => tasksApi.complete(id),
    onSuccess: (data) => { toast.success(data.message || 'Completed! 🎯'); qc.invalidateQueries({ queryKey: ['tasks'] }); },
  })

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => { toast.success('Task deleted'); qc.invalidateQueries({ queryKey: ['tasks'] }); },
  })

  const delayMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => tasksApi.delay(id, 'Rescheduled by user'),
    onSuccess: () => { toast.success('Task rescheduled'); qc.invalidateQueries({ queryKey: ['tasks'] }); },
  })

  const subjects = [...new Set(tasks.map(t => t.subject))].filter(Boolean)

  const taskGroups = {
    delayed: tasks.filter(t => t.status === 'DELAYED'),
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS'),
    pending: tasks.filter(t => t.status === 'PENDING'),
    completed: tasks.filter(t => t.status === 'COMPLETED'),
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="text-primary" size={24} /> Tasks
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tasks.filter(t => t.status !== 'COMPLETED').length} pending · {tasks.filter(t => t.status === 'COMPLETED').length} completed
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <Filter size={14} className="text-muted-foreground" />
          {['', 'PENDING', 'IN_PROGRESS', 'DELAYED', 'COMPLETED'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn('px-3 py-1 rounded-full text-xs font-medium transition-all', filter === s ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:text-foreground')}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        {subjects.length > 0 && (
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-1 text-xs focus:outline-none">
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Delayed tasks warning */}
      {taskGroups.delayed.length > 0 && (
        <div className="card-glass p-4 border-l-4 border-red-500 bg-red-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="font-medium text-sm text-red-400">{taskGroups.delayed.length} Delayed Tasks</span>
          </div>
          <div className="space-y-2">
            {taskGroups.delayed.map(task => (
              <div key={task.id} className="flex items-center justify-between">
                <span className="text-sm">{getTaskTypeIcon(task.type)} {task.title}</span>
                <button onClick={() => completeMutation.mutate(task.id)}
                  className="text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 px-2 py-1 rounded transition-colors">
                  Complete now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-secondary/50 rounded-xl animate-pulse" />)}</div>
      ) : tasks.length === 0 ? (
        <div className="card-glass p-14 text-center">
          <CheckSquare size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <h3 className="font-semibold mb-1">No tasks yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add tasks manually or import from syllabus PDF</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <Plus size={14} className="inline mr-1" /> Add First Task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                'card-glass p-4 flex items-center gap-4 group hover:border-border transition-all',
                task.status === 'COMPLETED' && 'opacity-60',
                task.status === 'DELAYED' && 'border-red-500/20'
              )}
            >
              <span className="text-xl shrink-0">{getTaskTypeIcon(task.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn('font-medium text-sm', task.status === 'COMPLETED' && 'line-through text-muted-foreground')}>
                    {task.title}
                  </p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getPriorityColor(task.priority))}>{task.priority}</span>
                  {task.isRevision && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">Revision</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{task.subject}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {task.estimatedHours}h</span>
                  {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="xp-badge">{task.xpReward} XP</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full hidden sm:block', getStatusColor(task.status))}>
                  {task.status}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {task.status !== 'COMPLETED' && (
                    <>
                      <button
                        onClick={() => completeMutation.mutate(task.id)}
                        className="p-1.5 rounded hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors"
                        title="Complete"
                      >
                        <CheckSquare size={14} />
                      </button>
                      <button
                        onClick={() => delayMutation.mutate({ id: task.id })}
                        className="p-1.5 rounded hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-400 transition-colors"
                        title="Delay"
                      >
                        <Play size={14} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { if (confirm('Delete task?')) deleteMutation.mutate(task.id) }}
                    className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && <TaskForm onClose={() => setShowForm(false)} onSuccess={() => qc.invalidateQueries({ queryKey: ['tasks'] })} />}
      </AnimatePresence>
    </div>
  )
}
