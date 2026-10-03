import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Clock3, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

function formatNotificationTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function NotificationsCenter() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [updatingId, setUpdatingId] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)

  const refresh = useCallback(async () => {
    const { data } = await api.get('/notifications')
    setNotifications(data.notifications || [])
    setUnreadCount(data.unreadCount || 0)
  }, [])

  useEffect(() => {
    let active = true
    const load = () => refresh().catch(() => {})
    load()
    const interval = window.setInterval(load, 15000)
    const onFocus = () => { if (active) load() }
    window.addEventListener('focus', onFocus)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [location.pathname, refresh])

  const handleNotificationClick = async (notification) => {
    if (!notification.read_at) {
      setUpdatingId(notification.id)
      try {
        await api.post(`/notifications/${notification.id}/read`)
        setNotifications((current) => current?.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item) || [])
        setUnreadCount((current) => Math.max(0, current - 1))
      } catch {
        // Keep the notification in the list and let the next refresh retry its read state.
      } finally {
        setUpdatingId(null)
      }
    }
    setOpen(false)
    if (notification.link) navigate(notification.link)
  }

  const handleMarkAllRead = async () => {
    if (!unreadCount || markingAll) return
    setMarkingAll(true)
    try {
      await api.post('/notifications/read-all')
      const readAt = new Date().toISOString()
      setNotifications((current) => current?.map((item) => ({ ...item, read_at: item.read_at || readAt })) || [])
      setUnreadCount(0)
    } catch {
      toast.error('Could not mark notifications as read')
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const willOpen = !open
          setOpen(willOpen)
          if (willOpen) refresh().catch(() => {})
        }}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel text-ink transition hover:border-primary/40 hover:bg-panel2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white ring-2 ring-app">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <section role="dialog" aria-label="Notifications" className="absolute right-0 top-12 z-[60] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-panel shadow-xl shadow-black/15 animate-fade-in-up">
          <header className="flex items-center justify-between border-b border-line px-4 py-3.5">
            <div><h2 className="text-sm font-semibold text-ink">Notifications</h2><p className="mt-0.5 text-[11px] text-muted">{unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}</p></div>
            <button type="button" onClick={handleMarkAllRead} disabled={!unreadCount || markingAll} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-primary transition hover:bg-primary/10 disabled:cursor-default disabled:opacity-40"><CheckCheck size={14} /> Mark all read</button>
          </header>

          <div className="max-h-[min(26rem,65vh)] overflow-y-auto">
            {notifications === null ? (
              <div className="px-4 py-10 text-center text-xs text-muted">Loading notifications…</div>
            ) : notifications.length ? (
              <div className="divide-y divide-line">
                {notifications.map((notification) => {
                  const unread = !notification.read_at
                  return (
                    <button key={notification.id} type="button" onClick={() => handleNotificationClick(notification)} disabled={updatingId === notification.id} className={`flex w-full gap-3 px-4 py-3.5 text-left transition hover:bg-panel2/70 disabled:opacity-60 ${unread ? 'bg-primary/[0.035]' : ''}`}>
                      <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${unread ? 'bg-primary/10 text-primary' : 'bg-panel2 text-muted'}`}><Sparkles size={16} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2"><span className={`text-xs leading-relaxed ${unread ? 'font-semibold text-ink' : 'font-medium text-ink'}`}>{notification.title}</span>{unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}</span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-muted">{notification.message}</span>
                        <span className="mt-2 flex items-center gap-1 text-[10px] text-muted"><Clock3 size={11} />{formatNotificationTime(notification.created_at)}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="px-5 py-10 text-center"><span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-panel2 text-muted"><Bell size={18} /></span><p className="text-sm font-medium text-ink">Nothing new</p><p className="mt-1 text-xs text-muted">Updates about your interview practice will show up here.</p></div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
