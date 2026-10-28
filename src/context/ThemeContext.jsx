import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'prepnova_theme'

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

/** Compute whether a given mode should render dark right now. */
const resolveIsDark = (mode) => mode === 'dark' || (mode === 'system' && systemPrefersDark())

/** Apply the theme to the <html> element (DOM side effect only). */
function applyThemeClass(isDark) {
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system')

  useEffect(() => {
    const handleThemeShortcut = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'k') return

      const target = event.target
      const tagName = target instanceof Element ? target.tagName : ''
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) return

      event.preventDefault()
      setMode((current) => (current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'))
    }

    window.addEventListener('keydown', handleThemeShortcut)
    return () => window.removeEventListener('keydown', handleThemeShortcut)
  }, [])

  // Effect only performs a DOM side effect (no setState) — safe with React 19 rules.
  useEffect(() => {
    applyThemeClass(resolveIsDark(mode))
    localStorage.setItem(STORAGE_KEY, mode)

    if (mode !== 'system') return undefined
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeClass(resolveIsDark('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const value = {
    mode,
    setMode,
    cycle: () => setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light')),
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Fast-refresh rule: exporting a hook alongside a component is intentional here.
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext)
}
