import { useUIStore, useAuthStore } from '../../store'
import { sessionsApi } from '../../lib/api'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ActiveSessionTimer() {
  const { activeSession, setActiveSession } = useUIStore()
  const { updateUser, user } = useAuthStore()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!activeSession) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSession])

  const endMutation = useMutation({
    mutationFn: () => sessionsApi.end(activeSession!.id),
    onSuccess: (data) => {
      toast.success(`Session ended! ${data.durationMinutes} min studied  🎯`)
      if (user) {
        updateUser({ totalStudyHours: user.totalStudyHours + data.durationMinutes / 60 })
      }
      setActiveSession(null)
    },
  })

  if (!activeSession) return null

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60

  return (
    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-lg text-sm">
      <Timer className="w-3.5 h-3.5 animate-pulse" />
      <span className="font-mono font-medium">
        {h > 0 ? `${h}:` : ''}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
      <span className="text-xs text-muted-foreground hidden sm:block">{activeSession.subject}</span>
      <button
        onClick={() => endMutation.mutate()}
        className="text-xs bg-green-500/20 hover:bg-green-500/30 px-2 py-0.5 rounded text-green-300 transition-colors"
      >
        End
      </button>
    </div>
  )
}
