import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Clock3, LifeBuoy, MessageSquareText, Plus, Send } from 'lucide-react'
import api from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Input from '../components/Input'
import Loader from '../components/Loader'
import PageHeader from '../components/PageHeader'

const CATEGORIES = ['Question', 'Technical issue', 'Account', 'Feedback', 'Complaint', 'Other']
const newTicketDefaults = { subject: '', category: 'Question', message: '' }

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

export default function SupportPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [creating, setCreating] = useState(false)
  const [reply, setReply] = useState('')
  const [form, setForm] = useState(newTicketDefaults)

  const loadTickets = useCallback(async () => {
    const { data } = await api.get('/support/tickets')
    setTickets(data.tickets || [])
  }, [])

  useEffect(() => {
    let active = true
    const requests = [api.get('/support/tickets')]
    if (ticketId) requests.push(api.get(`/support/tickets/${ticketId}`))
    Promise.all(requests)
      .then(([listResponse, detailResponse]) => {
        if (!active) return
        setTickets(listResponse.data.tickets || [])
        setTicket(detailResponse?.data.ticket || null)
      })
      .catch((error) => {
        if (active) {
          toast.error(error.response?.data?.message || 'Could not load your support tickets')
          if (ticketId && error.response?.status === 404) navigate('/support', { replace: true })
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [ticketId, navigate])

  const handleCreate = async (event) => {
    event.preventDefault()
    setCreating(true)
    try {
      const { data } = await api.post('/support/tickets', form)
      setForm(newTicketDefaults)
      toast.success('Support ticket submitted')
      navigate(`/support/${data.ticket.id}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit your ticket')
    } finally {
      setCreating(false)
    }
  }

  const handleReply = async (event) => {
    event.preventDefault()
    if (!ticket || !reply.trim()) return
    setSending(true)
    try {
      const { data } = await api.post(`/support/tickets/${ticket.id}/messages`, { message: reply })
      setTicket((current) => ({ ...current, messages: [...current.messages, data.message], updated_at: data.message.created_at }))
      setReply('')
      await loadTickets()
      toast.success('Reply sent')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send your reply')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader size="lg" /></div>

  if (ticketId && (!ticket || String(ticket.id) !== ticketId)) return <div className="flex min-h-[60vh] items-center justify-center"><Loader size="lg" /></div>

  if (ticketId && ticket) {
    return (
      <div className="animate-fade-in space-y-5">
        <Link to="/support" className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-primary"><ArrowLeft size={16} /> All support tickets</Link>
        <PageHeader icon={<MessageSquareText size={20} />} title={ticket.subject} subtitle={`Ticket #${ticket.id} · ${ticket.category}`} actions={<Badge variant={statusVariant(ticket.status)}>{statusLabel(ticket.status)}</Badge>} />
        <Card className="space-y-4">
          {ticket.messages.map((message) => {
            const fromSupport = message.sender_role === 'admin'
            return (
              <article key={message.id} className={`max-w-[92%] rounded-2xl border p-4 sm:max-w-[82%] ${fromSupport ? 'border-primary/20 bg-primary/5' : 'ml-auto border-line bg-panel2'}`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-ink">{fromSupport ? 'PrepNova support' : 'You'}</p><time className="text-[10px] text-muted">{dateTime(message.created_at)}</time></div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{message.message}</p>
              </article>
            )
          })}
          {ticket.status === 'closed' ? (
            <div className="rounded-xl border border-line bg-panel2 px-4 py-3 text-xs leading-relaxed text-muted">This ticket has been closed by support. If you need more help, please create a new ticket.</div>
          ) : (
            <form onSubmit={handleReply} className="border-t border-line pt-4">
              <label htmlFor="support-reply" className="mb-2 block text-xs font-semibold text-ink">Reply to this ticket</label>
              <textarea id="support-reply" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} rows={4} required placeholder="Add details or respond to support..." className="w-full resize-y rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
              <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[11px] text-muted">Only support admins can close a ticket.</span><Button type="submit" loading={sending} disabled={!reply.trim()}><Send size={15} /> Send reply</Button></div>
            </form>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader icon={<LifeBuoy size={20} />} title="Help & support" subtitle="Send us a question, report an issue, or share feedback." />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Plus size={19} /></span><div><h2 className="font-semibold text-ink">Create a ticket</h2><p className="mt-1 text-xs leading-relaxed text-muted">Our team will reply in your PrepNova support inbox.</p></div></div>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label="Subject" value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} minLength={4} maxLength={160} required placeholder="Briefly describe what you need" />
            <label className="block text-sm font-medium text-ink">Category
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
            </label>
            <label className="block text-sm font-medium text-ink">What can we help with?
              <textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} minLength={10} maxLength={5000} rows={6} required placeholder="Include any details that might help us understand the issue..." className="mt-1.5 w-full resize-y rounded-xl border border-line bg-panel px-3 py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-muted/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
            </label>
            <Button type="submit" loading={creating} className="w-full"><Send size={16} /> Submit ticket</Button>
          </form>
        </Card>

        <Card padded={false}>
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h2 className="font-semibold text-ink">Your tickets</h2><p className="mt-1 text-xs text-muted">Follow replies and updates here.</p></div><Badge variant="secondary">{tickets.length}</Badge></div>
          {tickets.length ? <div className="divide-y divide-line">{tickets.map((item) => (
            <Link key={item.id} to={`/support/${item.id}`} className="block px-5 py-4 transition-colors hover:bg-panel2/60">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{item.subject}</p><p className="mt-1 text-[11px] text-muted">#{item.id} · {item.category} · Updated {dateTime(item.updated_at)}</p></div><Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge></div>
              {item.last_message && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{item.last_sender_role === 'admin' ? 'Support: ' : 'You: '}{item.last_message}</p>}
            </Link>
          ))}</div> : <div className="px-5 py-12 text-center"><MessageSquareText size={27} className="mx-auto mb-2 text-muted/60" /><p className="text-sm font-medium text-ink">No tickets yet</p><p className="mt-1 text-xs text-muted">Your submitted questions and complaints will appear here.</p></div>}
        </Card>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted"><Clock3 size={12} />You can reply to open tickets. Only an admin can close them.</p>
    </div>
  )
}
