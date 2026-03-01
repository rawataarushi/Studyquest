import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { usersApi, integrationsApi } from '../lib/api'
import { useAuthStore } from '../store'
import {
  User, Shield, Code2, Trophy, Flame, Clock, CheckSquare,
  Zap, Star, Loader2, Save, Link2, ExternalLink, Award
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, getLevelInfo } from '../lib/utils'

const BRANCHES = ['Computer Science', 'Electrical', 'Electronics', 'Mechanical', 'Civil', 'Chemical', 'Aerospace', 'Biomedical', 'Other']

export default function Profile() {
  const qc = useQueryClient()
  const { user, setAuth, token } = useAuthStore()
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({
    name: user?.name || '', branch: user?.branch || '', semester: user?.semester || '',
    college: user?.college || '',
    leetcodeUsername: user?.leetcodeUsername || '', codeforcesHandle: user?.codeforcesHandle || ''
  })
  const [leetcodeInput, setLeetcodeInput] = useState(user?.leetcodeUsername || '')
  const [cfInput, setCfInput] = useState(user?.codeforcesHandle || '')

  const { data: badges } = useQuery({ queryKey: ['user-badges'], queryFn: usersApi.getBadges })
  const { data: statsData } = useQuery({ queryKey: ['user-stats'], queryFn: () => usersApi.getStats('monthly') })
  const { data: lcData, refetch: refetchLc } = useQuery({
    queryKey: ['leetcode', user?.leetcodeUsername],
    queryFn: () => integrationsApi.getLeetCode(user!.leetcodeUsername!),
    enabled: !!user?.leetcodeUsername,
  })
  const { data: cfData, refetch: refetchCf } = useQuery({
    queryKey: ['codeforces', user?.codeforcesHandle],
    queryFn: () => integrationsApi.getCodeforces(user!.codeforcesHandle!),
    enabled: !!user?.codeforcesHandle,
  })

  const updateMutation = useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: (data) => {
      setAuth(data.user, token!)
      qc.invalidateQueries({ queryKey: ['user-badges'] })
      toast.success('Profile updated!')
      setEditMode(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update'),
  })

  const handleSave = () => updateMutation.mutate(form)

  const handleConnectLc = async () => {
    if (!leetcodeInput.trim()) return
    updateMutation.mutate({ ...form, leetcodeUsername: leetcodeInput }, {
      onSuccess: () => { setForm(f => ({ ...f, leetcodeUsername: leetcodeInput })); setTimeout(() => refetchLc(), 500) }
    })
  }
  const handleConnectCf = async () => {
    if (!cfInput.trim()) return
    updateMutation.mutate({ ...form, codeforcesHandle: cfInput }, {
      onSuccess: () => { setForm(f => ({ ...f, codeforcesHandle: cfInput })); setTimeout(() => refetchCf(), 500) }
    })
  }

  const { currentLevelXp, nextLevelXp, progress } = getLevelInfo(user?.xp ?? 0, user?.level ?? 1)
  const allBadges: any[] = badges?.badges || []
  const earned = allBadges.filter((b: any) => b.userBadge)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <User className="text-primary" size={24} /> Profile
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Avatar + level */}
        <div className="space-y-4">
          <div className="card-glass p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-3xl font-bold mx-auto mb-3">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <h2 className="font-bold text-lg">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {user?.college && <p className="text-xs text-muted-foreground mt-0.5">{user.college}</p>}
            <div className="mt-3 flex justify-center gap-2 flex-wrap">
              {user?.branch && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{user.branch}</span>}
              {user?.semester && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">Sem {user.semester}</span>}
            </div>

            <div className="mt-5 text-left">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-semibold flex items-center gap-1"><Star size={13} className="text-yellow-400" /> Level {user?.level}</span>
                <span className="text-xs text-muted-foreground">{currentLevelXp} / {nextLevelXp} XP</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-purple-500 to-yellow-500 rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          </div>

          {/* Stats summary */}
          <div className="card-glass p-4 space-y-3">
            <h3 className="text-sm font-semibold">Stats</h3>
            {[
              { icon: Zap, label: 'Total XP', value: (user?.xp ?? 0).toLocaleString(), color: 'text-yellow-400' },
              { icon: CheckSquare, label: 'Tasks Done', value: user?.tasksCompleted ?? 0, color: 'text-green-400' },
              { icon: Clock, label: 'Study Hours', value: `${Math.round((user?.totalStudyHours ?? 0))}h`, color: 'text-blue-400' },
              { icon: Flame, label: 'Current Streak', value: `${user?.streak ?? 0} days`, color: 'text-orange-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon size={14} className={color} />{label}
                </span>
                <span className="text-sm font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Edit + integrations + badges */}
        <div className="lg:col-span-2 space-y-5">
          {/* Edit Profile */}
          <div className="card-glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Shield size={16} className="text-primary" /> Profile Info</h3>
              <button onClick={() => editMode ? handleSave() : setEditMode(true)}
                disabled={updateMutation.isPending}
                className={cn('flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors',
                  editMode ? 'bg-primary text-white hover:bg-primary/90' : 'border border-border hover:bg-secondary')}>
                {updateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : editMode ? <Save size={13} /> : null}
                {editMode ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Full Name', type: 'text' },
                { key: 'college', label: 'College/University', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    disabled={!editMode} type={f.type}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Branch</label>
                <select value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))}
                  disabled={!editMode} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm disabled:opacity-60 focus:outline-none">
                  <option value="">Select branch</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Semester</label>
                <select value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}
                  disabled={!editMode} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm disabled:opacity-60 focus:outline-none">
                  <option value="">Select</option>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
            </div>
            {editMode && (
              <button onClick={() => setEditMode(false)} className="mt-3 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            )}
          </div>

          {/* Coding Platform Integration */}
          <div className="card-glass p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4"><Code2 size={16} className="text-primary" /> Coding Platforms</h3>
            <div className="space-y-4">
              {/* LeetCode */}
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">LeetCode Username</label>
                <div className="flex gap-2">
                  <input value={leetcodeInput} onChange={e => setLeetcodeInput(e.target.value)}
                    placeholder="your-leetcode-username"
                    className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <button onClick={handleConnectLc} disabled={updateMutation.isPending}
                    className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                    <Link2 size={13} /> Connect
                  </button>
                </div>
                {lcData?.stats && (
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span className="text-green-400 font-medium">{lcData.stats.easySolved} Easy</span>
                    <span className="text-yellow-400 font-medium">{lcData.stats.mediumSolved} Medium</span>
                    <span className="text-red-400 font-medium">{lcData.stats.hardSolved} Hard</span>
                    <a href={`https://leetcode.com/${user?.leetcodeUsername}`} target="_blank" rel="noreferrer"
                      className="ml-auto text-primary hover:underline flex items-center gap-1">View <ExternalLink size={10} /></a>
                  </div>
                )}
              </div>

              {/* Codeforces */}
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">Codeforces Handle</label>
                <div className="flex gap-2">
                  <input value={cfInput} onChange={e => setCfInput(e.target.value)}
                    placeholder="your-cf-handle"
                    className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <button onClick={handleConnectCf} disabled={updateMutation.isPending}
                    className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                    <Link2 size={13} /> Connect
                  </button>
                </div>
                {cfData?.user && (
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>Rank: <span className="text-foreground font-medium">{cfData.user.rank}</span></span>
                    <span>Rating: <span className="text-primary font-medium">{cfData.user.rating}</span></span>
                    <span>AC: <span className="text-green-400 font-medium">{cfData.solvedCount}</span></span>
                    <a href={`https://codeforces.com/profile/${user?.codeforcesHandle}`} target="_blank" rel="noreferrer"
                      className="ml-auto text-primary hover:underline flex items-center gap-1">View <ExternalLink size={10} /></a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="card-glass p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Award size={16} className="text-primary" />
              Badges <span className="text-xs text-muted-foreground font-normal ml-1">{earned.length}/{allBadges.length} earned</span>
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {allBadges.map((b: any) => {
                const isEarned = !!b.userBadge
                return (
                  <div key={b.id} className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center',
                    isEarned ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border/30 opacity-40 grayscale'
                  )}>
                    <span className="text-2xl">{b.icon}</span>
                    <p className="text-xs font-medium leading-tight">{b.name}</p>
                    {isEarned && b.userBadge?.earnedAt && (
                      <p className="text-xs text-muted-foreground">{new Date(b.userBadge.earnedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
