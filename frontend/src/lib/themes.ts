export interface ColorTheme {
  name: string
  primary: string
  background: string
  card: string
  secondary: string
  border: string
  ring: string
  accent: string
  swatch: string // hex for preview swatch
}

export const COLOR_THEMES: Record<string, ColorTheme> = {
  blue: {
    name: 'Blue',
    swatch: '#3b82f6',
    primary: '217 91% 60%',
    background: '222 47% 8%',
    card: '222 47% 11%',
    secondary: '222 47% 16%',
    border: '222 47% 18%',
    ring: '217 91% 60%',
    accent: '262 80% 65%',
  },
  purple: {
    name: 'Purple',
    swatch: '#a855f7',
    primary: '271 81% 65%',
    background: '255 30% 8%',
    card: '255 28% 11%',
    secondary: '255 25% 16%',
    border: '255 25% 20%',
    ring: '271 81% 65%',
    accent: '217 91% 60%',
  },
  green: {
    name: 'Green',
    swatch: '#22c55e',
    primary: '142 71% 45%',
    background: '150 30% 7%',
    card: '150 25% 10%',
    secondary: '150 20% 15%',
    border: '150 20% 18%',
    ring: '142 71% 45%',
    accent: '217 91% 60%',
  },
  teal: {
    name: 'Teal',
    swatch: '#14b8a6',
    primary: '172 76% 45%',
    background: '180 30% 7%',
    card: '180 25% 10%',
    secondary: '180 20% 15%',
    border: '180 20% 18%',
    ring: '172 76% 45%',
    accent: '262 80% 65%',
  },
  orange: {
    name: 'Orange',
    swatch: '#f97316',
    primary: '25 95% 53%',
    background: '20 30% 7%',
    card: '20 25% 10%',
    secondary: '20 20% 15%',
    border: '20 20% 18%',
    ring: '25 95% 53%',
    accent: '262 80% 65%',
  },
  pink: {
    name: 'Pink',
    swatch: '#ec4899',
    primary: '330 81% 60%',
    background: '330 25% 7%',
    card: '330 20% 10%',
    secondary: '330 15% 15%',
    border: '330 15% 18%',
    ring: '330 81% 60%',
    accent: '262 80% 65%',
  },
  red: {
    name: 'Red',
    swatch: '#ef4444',
    primary: '0 84% 60%',
    background: '0 25% 7%',
    card: '0 20% 10%',
    secondary: '0 15% 15%',
    border: '0 15% 18%',
    ring: '0 84% 60%',
    accent: '262 80% 65%',
  },
  gold: {
    name: 'Gold',
    swatch: '#eab308',
    primary: '45 96% 52%',
    background: '40 25% 7%',
    card: '40 20% 10%',
    secondary: '40 15% 15%',
    border: '40 15% 18%',
    ring: '45 96% 52%',
    accent: '262 80% 65%',
  },
}

export function applyTheme(themeKey: string) {
  const theme = COLOR_THEMES[themeKey]
  if (!theme) return
  const root = document.documentElement
  root.style.setProperty('--primary', theme.primary)
  root.style.setProperty('--background', theme.background)
  root.style.setProperty('--card', theme.card)
  root.style.setProperty('--popover', theme.card)
  root.style.setProperty('--secondary', theme.secondary)
  root.style.setProperty('--muted', theme.secondary)
  root.style.setProperty('--border', theme.border)
  root.style.setProperty('--input', theme.secondary)
  root.style.setProperty('--ring', theme.ring)
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--primary-foreground', '222 47% 8%')
}
