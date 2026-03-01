import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { challengesApi } from '../lib/api'
import { useAuthStore } from '../store'
import { Swords, Plus, Trophy, Clock, CheckCircle, X, Loader2, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatDate } from '../lib/utils'

const CHALLENGE_TYPES = [
  { value: 'TASKS_COMPLETED', label: 'Tasks Completed', unit: 'tasks' },
  { value: 'STUDY_HOURS', label: 'Study Hours', unit: 'hours' },
  { value: 'STREAK_DAYS', label: 'Streak Days', unit: 'days' },
  { value: 'XP_POINTS', label: 'XP Points', unit: 'XP' },
  { value: 'LEETCODE_PROBLEMS', label: 'LeetCode Problems', unit: 'problems' },
]

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  PENDING:   { color: 'text-yellow-400 bg-yellow-400/10', label: 'Pending' },
  ACTIVE:    { color: 'text-blue-400 bg-blue-400/10',    label: 'Active' },
  COMPLETED: { color: 'text-green-400 bg-green-400/10',  label: 'Completed' },
  DECLINED:  { color: 'text-red-400 bg-red-400/10',      label: 'Declined' },
}

export default function Challenges() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab] = useState<'all' | 'received'>('all')
  const [form, setForm] = useState({
    receiverUsername: '', title: '', description: '',
    challengeType: 'TASKS_COMPLETED', targetValue: 10, startDate: '', endDate: ''
  })

  const { data, isLoading } = useQuery({ queryKey: ['challenges'], queryFn: challengesApi.getAll })

  const createMutation = useMutation({
    mutationFn: challengesApi.create,
    onSuccess: () => {
      toast.success('Challenge sent!')
      qc.invalidateQueries({ queryKey: ['challenges'] })
      setShowModal(false)
      setForm({ receiverUsername: '', title: '', description: '', challengeType: 'TASKS_COMPLETED', targetValue: 10, startDate: '', endDate: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to create challenge'),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) =>
      action === 'accept' ? challengesApi.accept(id) : challengesApi.decline(id),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === 'accept' ? 'Challenge accepted! Good luck!' : 'Challenge declined')
      qc.invalidateQueries({ queryKey: ['challenges'] })
    },
    onError: () => toast.error('Failed to respond'),
  })

  const allChallenges = data?.challenges || []
  const received = allChallenges.filter((c: any) => c.receiver?.id === user?.id && c.status === 'PENDING')
  const displayed = tab === 'received' ? received : allChallenges

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="text-primary" size={24} /> Challenges
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Challenge your peers to study competitions and prove your grind
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Create Challenge
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-secondary/50 p-1 rounded-lg w-fit">
        {(['all', 'received'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize',
              tab === t ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'received' && received.length > 0
              ? `Received (${received.length})`
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : displayed.length === 0 ? (
        <div className="card-glass p-14 text-center">
          <Swords size={48} className="mx-auto mb-4 text-muted-foreground opacity-20" />
          <h2 className="font-semibold">{tab === 'received' ? 'No pending challenges' : 'No challenges yet'}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === 'all' ? "Challenge your friends to compete on study hours, tasks, streaks, and more!" : "Check back later for new challenges"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {displayed.map((c: any) => {
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.PENDING
            const ctInfo = CHALLENGE_TYPES.find(t => t.value === c.challengeType)
            const isSender = c.sender?.id === user?.id
            const senderProg = Math.min(100, c.targetValue > 0 ? (c.senderProgress / c.targetValue) * 100 : 0)
            const receiverProg = Math.min(100, c.targetValue > 0 ? (c.receiverProgress / c.targetValue) * 100 : 0)

            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="card-glass p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{c.title}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.color)}>{cfg.label}</span>
                      {ctInfo && <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">{ctInfo.label}</span>}
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User size={11} />{isSender ? `You → ${c.receiver?.name}` : `${c.sender?.name} → You`}</span>
                      <span className="flex items-center gap-1"><Trophy size={11} /> Target: {c.targetValue} {ctInfo?.unit}</span>
                      {c.endDate && <span className="flex items-center gap-1"><Clock size={11} /> Ends {formatDate(c.endDate)}</span>}
                    </div>
                  </div>

                  {c.status === 'PENDING' && !isSender && (
                    <div className="flex gap-2">
                      <button onClick={() => respondMutation.mutate({ id: c.id, action: 'accept' })}
                        disabled={respondMutation.isPending}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                        <CheckCircle size={13} /> Accept
                      </button>
                      <button onClick={() => respondMutation.mutate({ id: c.id, action: 'decline' })}
                        disabled={respondMutation.isPending}
                        className="flex items-center gap-1 bg-red-600/80 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                        <X size={13} /> Decline
                      </button>
                    </div>
                  )}
                </div>

                {(c.status === 'ACTIVE' || c.status === 'COMPLETED') && (
                  <div className="space-y-2">
                    {[
                      { name: c.sender?.name + (isSender ? ' (You)' : ''), prog: senderProg, val: c.senderProgress },
                      { name: c.receiver?.name + (!isSender ? ' (You)' : ''), prog: receiverProg, val: c.receiverProgress },
                    ].map((p, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground">{p.val} / {c.targetValue} {ctInfo?.unit}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${p.prog}%` }}
                            transition={{ duration: 0.8 }}
                            className={cn('h-full rounded-full', i === 0 ? 'bg-primary' : 'bg-purple-500')}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-background border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Swords size={18} className="text-primary" /> New Challenge</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Opponent Username *</label>
                <input value={form.receiverUsername} onChange={e => setForm(f => ({ ...f, receiverUsername: e.target.value }))}
                  placeholder="their username"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Challenge Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. 7-Day Grind Challenge"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Type</label>
                  <select value={form.challengeType} onChange={e => setForm(f => ({ ...f, challengeType: e.target.value }))}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                    {CHALLENGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Target</label>
                  <input type="number" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: +e.target.value }))}
                    min={1} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-border rounded-lg py-2.5 text-sm hover:bg-secondary transition-colors">Cancel</button>
                <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.receiverUsername || !form.title}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Send Challenge
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
