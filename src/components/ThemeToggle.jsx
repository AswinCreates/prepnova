import { useTheme } from '../context/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

/** Full segmented control (Light / Dark / System). */
export default function ThemeToggle({ className = '' }) {
  const { mode, setMode } = useTheme()
  const isLandingToggle = className.split(/\s+/).includes('landing-theme-toggle')

  return (
    <div
      role="group"
      aria-label="Theme"
      className={`flex items-center gap-1 ${isLandingToggle ? 'border-0 bg-transparent p-0' : 'rounded-xl border border-line bg-panel2 p-1'} ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mode === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={active}
            title={`${label} mode`}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
              active
                ? isLandingToggle ? 'text-primary' : 'bg-primary text-white shadow-sm shadow-primary/20'
                : isLandingToggle ? 'text-muted hover:text-primary' : 'text-muted hover:bg-panel hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Single button that cycles Light → Dark → System (for compact headers). */
export function ThemeCycleButton({ className = '' }) {
  const { mode, cycle } = useTheme()
  const current = OPTIONS.find((o) => o.value === mode) || OPTIONS[2]
  const { Icon, label } = current

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${label} (click to change)`}
      aria-label={`Theme: ${label}. Click to change.`}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-panel2 text-ink transition-all duration-200 hover:border-primary/50 hover:text-primary active:scale-95 ${className}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
