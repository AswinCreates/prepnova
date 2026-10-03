import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Clock3, Inbox, RefreshCw, Send, Ticket, UserRound } from 'lucide-react'
import api from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'

const FILTERS = [
  { value: '', label: 'All tickets' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
]

function statusVariant(status) {
  if (status === 'closed') return 'secondary'
  if (status === 'in_progress') return 'warning'
  return 'success'
}

function statusLabel(status) {
  return status === 'in_progress' ? 'In progress' : status === 'closed' ? 'Closed' : 'Open'
}

function dateTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function AdminTicketsPanel() {
  const [filter, setFilter] = useState('')
  const [tickets, setTickets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)

  const loadTickets = useCallback(async () => {
    const { data } = await api.get('/admin/support/tickets', { params: filter ? { status: filter } : {} })
    setTickets(data.tickets || [])
  }, [filter])

  useEffect(() => {
    let active = true
    const refresh = (showError = false) => api.get('/admin/support/tickets', { params: filter ? { status: filter } : {} })
      .then(({ data }) => { if (active) setTickets(data.tickets || []) })
      .catch((error) => { if (active && showError) toast.error(error.response?.data?.message || 'Could not load support tickets') })
      .finally(() => { if (active) setLoading(false) })
    refresh(true)
    const interval = window.setInterval(refresh, 15000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [filter])

  useEffect(() => {
    if (!selectedId) return undefined
    let active = true
    const refresh = () => api.get(`/admin/support/tickets/${selectedId}`)
      .then(({ data }) => { if (active) setTicket(data.ticket) })
      .catch(() => {})
    const interval = window.setInterval(refresh, 15000)
    return () => { active = false; window.clearInterval(interval) }
  }, [selectedId])

  const selectTicket = async (id) => {
    setSelectedId(id)
    setDetailLoading(true)
    try {
      const { data } = await api.get(`/admin/support/tickets/${id}`)
      setTicket(data.ticket)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load this ticket')
    } finally {
      setDetailLoading(false)
    }
  }

  const sendReply = async (event) => {
    event.preventDefault()
    if (!ticket || !reply.trim()) return
    setSending(true)
    try {
      const { data } = await api.post(`/admin/support/tickets/${ticket.id}/messages`, { message: reply })
      setTicket((current) => ({ ...current, status: 'in_progress', updated_at: data.message.created_at, messages: [...current.messages, data.message] }))
      setReply('')
      await loadTickets()
      toast.success('Reply sent to the user')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send your reply')
    } finally {
      setSending(false)
    }
  }

  const closeTicket = async () => {
    if (!ticket || ticket.status === 'closed') return
    const confirmed = window.confirm(`Close ticket #${ticket.id} from ${ticket.requester_name}? The user will be notified and can no longer reply to this ticket.`)
    if (!confirmed) return
    setClosing(true)
    try {
      const { data } = await api.post(`/admin/support/tickets/${ticket.id}/close`)
      setTicket((current) => ({ ...current, status: data.ticket.status, closed_at: data.ticket.closed_at, updated_at: data.ticket.closed_at }))
      await loadTickets()
      toast.success('Ticket closed')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not close ticket')
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-ink">Support tickets</h2><p className="mt-1 text-xs text-muted">Respond to user questions and complaints, then close resolved tickets.</p></div>
        <Button type="button" variant="outline" size="sm" loading={loading} onClick={() => loadTickets().catch((error) => toast.error(error.response?.data?.message || 'Could not refresh tickets'))}><RefreshCw size={14} /> Refresh</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter support tickets">
        {FILTERS.map((item) => <button key={item.value} type="button" onClick={() => { setLoading(true); setFilter(item.value) }} aria-pressed={filter === item.value} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${filter === item.value ? 'border-primary bg-primary text-white' : 'border-line bg-panel text-muted hover:bg-panel2 hover:text-ink'}`}>{item.label}</button>)}
      </div>

      <div className="grid min-h-[440px] items-start gap-4 xl:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.5fr)]">
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3"><p className="text-xs font-semibold text-ink">Ticket inbox</p><Badge variant="secondary">{tickets.length}</Badge></div>
          {loading ? <div className="flex justify-center py-12"><Loader /></div> : tickets.length ? <div className="max-h-[620px] divide-y divide-line overflow-y-auto">{tickets.map((item) => (
            <button key={item.id} type="button" onClick={() => selectTicket(item.id)} className={`w-full px-4 py-3.5 text-left transition-colors hover:bg-panel2/60 ${selectedId === item.id ? 'bg-primary/5' : ''}`}>
              <div className="flex items-start justify-between gap-2"><p className="line-clamp-1 text-xs font-semibold text-ink">{item.subject}</p><Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge></div>
              <p className="mt-1 text-[10px] text-muted">#{item.id} · {item.category}</p>
              <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted">{item.requester_name} · {item.last_message || 'No message preview'}</p>
              <p className="mt-2 text-[10px] text-muted">Updated {dateTime(item.updated_at)}</p>
            </button>
          ))}</div> : <div className="px-4 py-12 text-center"><Inbox size={25} className="mx-auto mb-2 text-muted/60" /><p className="text-xs font-medium text-ink">No tickets in this view</p></div>}
        </Card>

        <Card className="min-h-[440px]" padded={false}>
          {!selectedId ? (
            <div className="flex min-h-[440px] flex-col items-center justify-center px-6 text-center"><Ticket size={30} className="mb-3 text-primary/70" /><p className="text-sm font-semibold text-ink">Select a ticket</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">Choose a ticket from the inbox to read the conversation and reply.</p></div>
          ) : detailLoading ? <div className="flex min-h-[440px] items-center justify-center"><Loader /></div> : ticket ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ink">{ticket.subject}</h3><Badge variant={statusVariant(ticket.status)}>{statusLabel(ticket.status)}</Badge></div><p className="mt-1 text-[11px] text-muted">Ticket #{ticket.id} · {ticket.category}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-ink"><UserRound size={13} className="text-muted" />{ticket.requester_name} <span className="text-muted">· {ticket.requester_email}</span></p></div>
                {ticket.status !== 'closed' && <Button type="button" variant="danger" size="sm" loading={closing} onClick={closeTicket}><Check size={14} /> Close ticket</Button>}
              </div>
              <div className="max-h-[360px] space-y-3 overflow-y-auto px-5 py-4">
                {ticket.messages.map((message) => {
                  const fromAdmin = message.sender_role === 'admin'
                  return <article key={message.id} className={`max-w-[95%] rounded-xl border p-3.5 ${fromAdmin ? 'ml-auto border-primary/20 bg-primary/5' : 'border-line bg-panel2'}`}><div className="mb-1.5 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-semibold text-ink">{fromAdmin ? `${message.sender_name} · Admin` : message.sender_name}</p><time className="text-[10px] text-muted">{dateTime(message.created_at)}</time></div><p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ink">{message.message}</p></article>
                })}
              </div>
              <div className="border-t border-line px-5 py-4">
                {ticket.status === 'closed' ? <p className="text-xs text-muted">Closed {ticket.closed_at ? dateTime(ticket.closed_at) : ''}. This ticket is read-only.</p> : <form onSubmit={sendReply}><label htmlFor="admin-ticket-reply" className="mb-2 block text-xs font-semibold text-ink">Reply to user</label><textarea id="admin-ticket-reply" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} rows={4} required placeholder="Write a helpful response..." className="w-full resize-y rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/20" /><div className="mt-3 flex items-center justify-between gap-3"><span className="flex items-center gap-1 text-[10px] text-muted"><Clock3 size={12} />The user will receive an in-app notification.</span><Button type="submit" loading={sending} disabled={!reply.trim()}><Send size={14} /> Send reply</Button></div></form>}
              </div>
            </>
          ) : <div className="flex min-h-[440px] items-center justify-center text-xs text-muted">Ticket details could not be loaded.</div>}
        </Card>
      </div>
    </div>
  )
}
