import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle, { ThemeCycleButton } from './ThemeToggle'
import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react'

/* --- nav icons --- */
const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-5 w-5 shrink-0',
}

const GridIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
)
const SparkIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)
const ClockIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)
const UserIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
)
const LogoutIcon = () => (
  <svg {...iconProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
)
const CloseIcon = () => (
  <svg {...iconProps}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: GridIcon, end: true },
  { to: '/interview/setup', label: 'New Interview', Icon: SparkIcon },
  { to: '/interview/history', label: 'History', Icon: ClockIcon },
  { to: '/profile', label: 'Profile', Icon: UserIcon },
]

export default function Sidebar({ open, onClose, collapsed = false, onToggleCollapse }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNav = () => onClose?.()

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-panel transition-all duration-300 lg:translate-x-0 ${
          collapsed ? 'lg:w-20' : 'lg:w-72'
        } ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className={`flex items-center justify-between px-5 py-5 ${collapsed ? 'lg:flex-col lg:justify-center lg:gap-3 lg:px-2' : ''}`}>
          <NavLink to="/dashboard" onClick={handleNav} title={collapsed ? 'PrepNova' : undefined} className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-lg font-black text-white shadow-lg shadow-primary/30">
              P
            </span>
            <span className={`text-lg font-bold tracking-tight ${collapsed ? 'lg:hidden' : ''}`}>
              <span className="text-primary">
                PrepNova
              </span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-panel2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-95 lg:flex"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-2 text-muted hover:bg-panel2 hover:text-ink lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Nav */}
        <nav className={`flex-1 space-y-1 px-3 py-2 ${collapsed ? 'lg:px-2' : ''}`}>
          <p className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted ${collapsed ? 'lg:hidden' : ''}`}>Menu</p>
          {[...NAV_ITEMS, ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin console', Icon: ShieldCheck }] : [])].map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              onClick={handleNav}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
                  isActive
                    ? 'bg-primary/10 text-primary dark:text-[#a7d4b6] ring-1 ring-primary/20 font-semibold'
                    : 'text-muted hover:bg-panel2 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-primary' : 'text-muted group-hover:text-ink'}>
                    <Icon />
                  </span>
                  <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
                  {isActive && <span className={`ml-auto h-1.5 w-1.5 rounded-full bg-primary ${collapsed ? 'lg:hidden' : ''}`} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: theme + user + logout */}
        <div className={`space-y-3 border-t border-line px-4 py-4 ${collapsed ? 'lg:px-2' : ''}`}>
          <div className={collapsed ? 'lg:hidden' : ''}><ThemeToggle /></div>
          {collapsed && <div className="hidden justify-center lg:flex"><ThemeCycleButton /></div>}

          <div title={collapsed ? `${user?.name || 'Candidate'}${user?.email ? ` · ${user.email}` : ''}` : undefined} className={`flex items-center gap-3 rounded-xl border border-line bg-panel2 px-3 py-2.5 ${collapsed ? 'lg:justify-center lg:px-1' : ''}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-sm font-semibold text-ink">{user?.name || 'Candidate'}</p>
              <p className="truncate text-xs text-muted">{user?.email || ''}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? 'Log out' : undefined}
            aria-label="Log out"
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <LogoutIcon />
            <span className={collapsed ? 'lg:hidden' : ''}>Log out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
