import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { leaderboardApi } from '../lib/api'
import { useAuthStore } from '../store'
import { Trophy, Flame, Zap, Clock, Star, Crown, Medal } from 'lucide-react'
import { cn, getLevelTitle } from '../lib/utils'

const TABS = ['Global', 'Weekly']

export default function Leaderboard() {
  const [tab, setTab] = useState('Global')
  const { user } = useAuthStore()

  const { data: globalData, isLoading: globalLoading } = useQuery({
    queryKey: ['leaderboard-global'],
    queryFn: leaderboardApi.getGlobal,
    enabled: tab === 'Global',
  })

  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ['leaderboard-weekly'],
    queryFn: leaderboardApi.getWeekly,
    enabled: tab === 'Weekly',
  })

  const { data: rankData } = useQuery({
    queryKey: ['my-rank'],
    queryFn: leaderboardApi.getMyRank,
  })

  const list = tab === 'Global' ? globalData?.leaderboard : weeklyData?.leaderboard
  const isLoading = tab === 'Global' ? globalLoading : weeklyLoading

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="text-yellow-400" size={20} />
    if (rank === 2) return <Medal className="text-gray-300" size={18} />
    if (rank === 3) return <Medal className="text-orange-400" size={18} />
    return <span className="text-muted-foreground font-bold text-sm w-5 text-center">{rank}</span>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-400" size={24} /> Leaderboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Compete with fellow students worldwide</p>
        </div>

        {rankData && (
          <div className="card-glass px-4 py-2.5 text-center hidden md:block">
            <p className="text-xs text-muted-foreground">Your rank</p>
            <p className="text-2xl font-bold gradient-text">#{rankData.rank}</p>
          </div>
        )}
      </div>

      {/* My stats banner */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-primary/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-lg font-bold text-white">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{user.name}</span>
                <span className="text-xs text-muted-foreground">@{user.username}</span>
              </div>
              <p className="text-xs text-muted-foreground">{getLevelTitle(user.level)} · Level {user.level}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="xp-badge"><Zap size={11} /> {user.xp}</div>
                <div className="text-xs text-muted-foreground mt-1">XP</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 text-orange-400 font-bold"><Flame size={14} />{user.streak}</div>
                <div className="text-xs text-muted-foreground mt-1">Streak</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex bg-secondary rounded-xl p-1.5 gap-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'Global' ? '🌍 Global' : '📅 This Week'}
          </button>
        ))}
      </div>

      {/* Leaderboard list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => <div key={i} className="h-16 bg-secondary/50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {(list || []).map((entry: {
            id: string; rank: number; username: string; name: string;
            xp: number; level: number; streak: number; tasksCompleted: number;
            totalStudyHours?: number; weeklyStudyMinutes?: number;
            badges?: Array<{ badge: { name: string; icon: string } }>
          }, i: number) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                'card-glass p-4 flex items-center gap-4 transition-all hover:border-border',
                entry.id === user?.id && 'border-primary/40 bg-primary/5',
                entry.rank === 1 && 'border-yellow-500/30 bg-yellow-500/5',
                entry.rank === 2 && 'border-gray-400/30',
                entry.rank === 3 && 'border-orange-500/30',
              )}
            >
              <div className="w-8 flex items-center justify-center shrink-0">
                {getRankIcon(entry.rank)}
              </div>

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {entry.name?.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{entry.name}</span>
                  {entry.id === user?.id && <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">You</span>}
                  {entry.badges?.slice(0, 2).map((b, j) => (
                    <span key={j} title={b.badge.name} className="text-xs">{b.badge.icon}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">@{entry.username}</span>
                  <span className="text-xs text-muted-foreground">Lv.{entry.level} · {getLevelTitle(entry.level)}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="text-center hidden sm:block">
                  <div className="xp-badge"><Zap size={11} />{entry.xp}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">XP</div>
                </div>
                <div className="text-center hidden md:block">
                  <div className="flex items-center gap-1 text-orange-400 font-bold text-sm">
                    <Flame size={13} />{entry.streak}
                  </div>
                  <div className="text-xs text-muted-foreground">Streak</div>
                </div>
                <div className="text-center hidden md:block">
                  <div className="flex items-center gap-1 text-green-400 font-bold text-sm">
                    <Star size={13} />{tab === 'Weekly' ? Math.round((entry.weeklyStudyMinutes || 0) / 60) : entry.tasksCompleted}
                  </div>
                  <div className="text-xs text-muted-foreground">{tab === 'Weekly' ? 'hrs/wk' : 'tasks'}</div>
                </div>
                {tab === 'Global' && entry.totalStudyHours !== undefined && (
                  <div className="text-center hidden lg:block">
                    <div className="flex items-center gap-1 text-blue-400 font-bold text-sm">
                      <Clock size={13} />{entry.totalStudyHours.toFixed(0)}h
                    </div>
                    <div className="text-xs text-muted-foreground">total</div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
