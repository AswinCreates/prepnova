import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { ThemeCycleButton } from './ThemeToggle'

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-5 w-5"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('prepnova_sidebar_collapsed') === 'true'
  )
  const location = useLocation()

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed
      localStorage.setItem('prepnova_sidebar_collapsed', String(next))
      return next
    })
  }

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    const id = setTimeout(() => setOpen(false), 0)
    return () => clearTimeout(id)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-app">
      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      <div className={sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}>
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-panel/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-panel2 text-ink active:scale-95"
          >
            <MenuIcon />
          </button>
          <span className="text-base font-bold">
            <span className="text-primary">
              PrepNova
            </span>
          </span>
          <ThemeCycleButton />
        </header>

        <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
