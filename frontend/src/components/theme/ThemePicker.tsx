import { useState, useRef, useEffect } from 'react'
import { Palette } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../store'
import { COLOR_THEMES, applyTheme } from '../../lib/themes'
import { cn } from '../../lib/utils'

export default function ThemePicker() {
  const [open, setOpen] = useState(false)
  const { accentColor, setAccentColor } = useUIStore()
  const ref = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(key: string) {
    setAccentColor(key)
    applyTheme(key)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Change theme color"
        className={cn(
          'p-2 rounded-lg hover:bg-secondary transition-colors',
          open && 'bg-secondary'
        )}
      >
        <Palette size={18} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-xl shadow-2xl z-50 p-3"
          >
            <p className="text-xs font-semibold text-muted-foreground mb-2.5 px-0.5">Color Theme</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  title={theme.name}
                  className={cn(
                    'flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all',
                    accentColor === key
                      ? 'bg-primary/15 ring-1 ring-primary'
                      : 'hover:bg-secondary'
                  )}
                >
                  <span
                    className="w-7 h-7 rounded-full border-2 border-white/10"
                    style={{ backgroundColor: theme.swatch }}
                  />
                  <span className="text-[10px] text-muted-foreground leading-none">{theme.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
