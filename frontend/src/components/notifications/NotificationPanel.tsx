import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../../lib/api'
import { timeAgo } from '../../lib/utils'
import { Bell, CheckCheck, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function NotificationPanel({ notifications, onClose }: {
  notifications: Notification[]
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const readAllMutation = useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const typeIcons: Record<string, string> = {
    LEVEL_UP: '🎉', BADGE_EARNED: '🏆', DELAY_DETECTED: '⚠️',
    CHALLENGE_RECEIVED: '⚔️', DEFAULT: '🔔',
  }

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-primary" />
          <span className="font-semibold text-sm">Notifications</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => readAllMutation.mutate()}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <CheckCheck size={13} /> All read
          </button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Bell className="mx-auto mb-2 opacity-30" size={24} />
            No notifications yet
          </div>
        ) : notifications.map(n => (
          <div
            key={n.id}
            className={`px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-lg shrink-0">{typeIcons[n.type] || typeIcons.DEFAULT}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
