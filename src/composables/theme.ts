import { ref } from 'vue'

/**
 * Lightweight theme controller. Kept outside Pinia on purpose so the theme can
 * be applied by an inline <head> script before the app mounts (no flash), and
 * so a single source of truth (the `dark` class on <html>) drives every token.
 */
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'fdx-theme'

export const theme = ref<Theme>('dark')
export const isDark = ref(true)

function resolveInitial(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* storage may be unavailable */ }
  // Default to the control-room dark theme unless the OS asks for light.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(next: Theme): void {
  theme.value = next
  isDark.value = next === 'dark'
  const root = document.documentElement
  root.classList.toggle('dark', isDark.value)
  root.style.colorScheme = next
  try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
}

export function toggleTheme(): void {
  applyTheme(isDark.value ? 'light' : 'dark')
}

export function initTheme(): void {
  applyTheme(resolveInitial())
}
