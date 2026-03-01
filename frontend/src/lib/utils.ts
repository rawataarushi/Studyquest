import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM dd, yyyy')
}

export function formatTime(date: string | Date) {
  return format(new Date(date), 'hh:mm a')
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    CRITICAL: 'text-red-400 bg-red-400/10',
    HIGH: 'text-orange-400 bg-orange-400/10',
    MEDIUM: 'text-yellow-400 bg-yellow-400/10',
    LOW: 'text-green-400 bg-green-400/10',
  }
  return colors[priority] || colors.MEDIUM
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    COMPLETED: 'text-green-400 bg-green-400/10',
    IN_PROGRESS: 'text-blue-400 bg-blue-400/10',
    PENDING: 'text-yellow-400 bg-yellow-400/10',
    DELAYED: 'text-red-400 bg-red-400/10',
    SKIPPED: 'text-gray-400 bg-gray-400/10',
  }
  return colors[status] || ''
}

export function getTaskTypeIcon(type: string) {
  const icons: Record<string, string> = {
    STUDY: '📖',
    REVISION: '🔄',
    ASSIGNMENT: '✏️',
    PROJECT: '🚀',
    EXAM_PREP: '🎯',
    PRACTICE: '⚡',
    BREAK: '☕',
  }
  return icons[type] || '📌'
}

export function getLevelTitle(level: number) {
  const titles = ['Newcomer', 'Apprentice', 'Scholar', 'Expert', 'Master', 'Champion', 'Legend', 'Myth', 'GOAT', 'Einstein']
  return titles[Math.min(level - 1, titles.length - 1)]
}

export function xpToNextLevel(xp: number): number {
  const levels = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500]
  const level = levels.findIndex(l => xp < l)
  return level === -1 ? levels[levels.length - 1] : levels[level]
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + '...' : str
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500]

export function getLevelInfo(xp: number, level: number) {
  const currentThreshold = LEVEL_THRESHOLDS[Math.min(level - 1, LEVEL_THRESHOLDS.length - 1)] ?? 0
  const nextThreshold = LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  const currentLevelXp = xp - currentThreshold
  const nextLevelXp = nextThreshold - currentThreshold
  const progress = nextLevelXp > 0 ? Math.min(100, (currentLevelXp / nextLevelXp) * 100) : 100
  return { currentLevelXp: Math.max(0, currentLevelXp), nextLevelXp, progress }
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
