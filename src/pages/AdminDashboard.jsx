import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Loader from '../components/Loader'
import Badge from '../components/Badge'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Activity, CalendarDays, Clock3, HelpCircle, LayoutDashboard, Plus, RefreshCw, RotateCcw, ShieldCheck, Trash2, Trophy, UserPlus, Users } from 'lucide-react'

function dateTime(value) {
  if (!value) return 'Never'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function shortDate(value) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function formatDuration(value) {
  const seconds = Number(value) || 0
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function ActivityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2.5 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-ink">{entry.fullDate}</p>
      <p className="text-xs text-primary">New accounts: {entry.newAccounts}</p>
      <p className="mt-0.5 text-xs text-secondary">Successful logins: {entry.logins}</p>
    </div>
  )
}

const initialAdminForm = { name: '', email: '', password: '' }
const initialQuestionForm = {
  mode: 'Technical', domain: 'Web Development', difficulty: 'Medium',
  questionText: '', category: '', sampleAnswer: '', isCompulsory: false,
}
const QUESTION_DOMAINS = ['General', 'Web Development', 'Data Science', 'DSA', 'System Design', 'HR / Behavioral']

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [questions, setQuestions] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardCount, setLeaderboardCount] = useState(0)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [resettingLeaderboard, setResettingLeaderboard] = useState(false)
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [form, setForm] = useState(initialAdminForm)
  const [questionForm, setQuestionForm] = useState(initialQuestionForm)

  const loadDashboard = useCallback(async () => {
    setRefreshing(true)
    try {
      const [dashboardResponse, accountsResponse, questionsResponse] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/accounts'),
        api.get('/admin/questions'),
      ])
      setStats({ ...dashboardResponse.data.stats, leaderboardResetAt: dashboardResponse.data.leaderboardResetAt })
      setAccounts(accountsResponse.data.accounts || [])
      setQuestions(questionsResponse.data.questions || [])
      return dashboardResponse.data
    } finally {
      setRefreshing(false)
    }
  }, [])

  const loadLeaderboard = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/leaderboard')
      setLeaderboard(data.leaderboard || [])
      setLeaderboardCount(data.participantCount || 0)
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const refresh = () => loadDashboard()
      .catch((error) => {
        if (active) toast.error(error.response?.data?.message || 'Could not load admin dashboard')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    refresh()
    const interval = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
    }
  }, [loadDashboard])

  useEffect(() => {
    if (activeSection !== 'leaderboard') return
    loadLeaderboard().catch((error) => toast.error(error.response?.data?.message || 'Could not load leaderboard'))
  }, [activeSection, loadLeaderboard])

  const chartData = useMemo(() => (stats?.trend || []).map((item) => ({
    ...item,
    name: shortDate(item.day),
    fullDate: new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date(`${item.day}T00:00:00`)),
  })), [stats])

  const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const updateQuestionForm = (event) => {
    const { name, value, type, checked } = event.target
    setQuestionForm((current) => {
      if (name === 'isCompulsory' && checked) {
        return { ...current, isCompulsory: true, mode: 'Both', domain: 'General' }
      }
      return { ...current, [name]: type === 'checkbox' ? checked : value }
    })
  }

  const handleCreateAdmin = async (event) => {
    event.preventDefault()
    setCreating(true)
    try {
      await api.post('/admin/admins', form)
      setForm(initialAdminForm)
      await loadDashboard()
      toast.success('Admin account created')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create admin account')
    } finally {
      setCreating(false)
    }
  }

  const handleCreateQuestion = async (event) => {
    event.preventDefault()
    setAddingQuestion(true)
    try {
      await api.post('/admin/questions', questionForm)
      setQuestionForm(initialQuestionForm)
      await loadDashboard()
      toast.success('Interview question added')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not add question')
    } finally {
      setAddingQuestion(false)
    }
  }

  const handleDeleteAccount = async (account) => {
    const confirmed = window.confirm(`Delete the account for ${account.name} (${account.email})? This also permanently deletes their interview history and reports.`)
    if (!confirmed) return

    setDeletingId(account.id)
    try {
      await api.delete(`/admin/accounts/${account.id}`)
      await loadDashboard()
      toast.success(`${account.name}'s account was deleted`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete account')
    } finally {
      setDeletingId(null)
    }
  }

  const handleResetLeaderboard = async () => {
    const confirmed = window.confirm('Reset the leaderboard now? Current rankings will be cleared. User accounts, interview history, and reports will remain unchanged.')
    if (!confirmed) return

    setResettingLeaderboard(true)
    setLeaderboardLoading(true)
    try {
      await api.post('/admin/leaderboard/reset')
      await Promise.all([loadDashboard(), loadLeaderboard()])
      toast.success('Leaderboard standings reset')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not reset the leaderboard')
    } finally {
      setResettingLeaderboard(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader size="lg" /></div>
  }

  const statCards = [
    { label: 'User accounts', value: stats?.totalUsers ?? 0, note: `+${stats?.newUsers30d ?? 0} in 30 days`, Icon: Users },
    { label: 'Successful logins', value: stats?.successfulLogins ?? 0, note: 'Recorded since analytics enabled', Icon: Activity },
    { label: 'Active this month', value: stats?.activeUsers30d ?? 0, note: 'Users signed in within 30 days', Icon: Clock3 },
    { label: 'Administrators', value: stats?.totalAdmins ?? 0, note: 'Accounts with admin access', Icon: ShieldCheck },
  ]

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        icon={<ShieldCheck size={20} />}
        title="Admin console"
        subtitle="Manage platform activity, accounts, questions, and leaderboard settings."
        actions={(
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" loading={refreshing} onClick={() => loadDashboard().catch((error) => toast.error(error.response?.data?.message || 'Could not refresh dashboard'))}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Badge variant="primary">Administrator</Badge>
          </div>
        )}
      />

      <nav aria-label="Admin console sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-panel p-1.5">
        {[
          { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
          { id: 'administration', label: 'Administration', Icon: ShieldCheck },
          { id: 'questions', label: 'Question bank', Icon: HelpCircle },
          { id: 'leaderboard', label: 'Leaderboard', Icon: Trophy },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id === 'leaderboard') setLeaderboardLoading(true)
              setActiveSection(id)
            }}
            aria-current={activeSection === id ? 'page' : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${activeSection === id ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-panel2 hover:text-ink'}`}
          >
            <Icon size={16} />{label}
          </button>
        ))}
      </nav>

      {activeSection === 'overview' && <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {statCards.map(({ label, value, note, Icon }) => (
          <Card key={label} className="animate-fade-in-up">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-xs font-medium text-muted">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums text-ink">{value.toLocaleString()}</p></div>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={18} /></span>
            </div>
            <p className="mt-3 text-[10px] text-muted">{note}</p>
          </Card>
        ))}
      </div>

      <Card className="animate-fade-in-up">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="font-semibold text-ink">Signups and login activity</h2><p className="mt-1 text-xs text-muted">Daily activity over the last 30 days</p></div>
            <div className="flex gap-3 text-[11px]"><span className="inline-flex items-center gap-1.5 text-primary"><i className="h-2 w-2 rounded-full bg-primary" />New accounts</span><span className="inline-flex items-center gap-1.5 text-secondary"><i className="h-2 w-2 rounded-full bg-secondary" />Successful logins</span></div>
          </div>
          {chartData.length === 0 ? <p className="py-16 text-center text-sm text-muted">No activity to chart yet.</p> : (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--pn-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--pn-muted)" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} stroke="var(--pn-muted)" fontSize={11} tickLine={false} />
                <Tooltip content={<ActivityTooltip />} cursor={{ fill: 'var(--pn-panel-2)' }} />
                <Bar dataKey="newAccounts" name="New accounts" fill="#176F68" radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar dataKey="logins" name="Successful logins" fill="#4D8C7A" radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="animate-fade-in-up">
          <div className="mb-4 flex items-center gap-2"><CalendarDays size={16} className="text-primary" /><h2 className="font-semibold text-ink">Recent signups</h2></div>
          {stats?.recentUsers?.length ? <div className="divide-y divide-line">{stats.recentUsers.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{account.name}</p><p className="truncate text-xs text-muted">{account.email}</p></div>
              <time className="shrink-0 text-[10px] text-muted">{dateTime(account.created_at)}</time>
            </div>
          ))}</div> : <p className="py-8 text-center text-sm text-muted">No user accounts yet.</p>}
        </Card>

        <Card className="animate-fade-in-up">
          <div className="mb-4 flex items-center gap-2"><Activity size={16} className="text-secondary" /><h2 className="font-semibold text-ink">Recent user logins</h2></div>
          {stats?.recentLogins?.length ? <div className="divide-y divide-line">{stats.recentLogins.map((event, index) => (
            <div key={`${event.email}-${event.logged_in_at}-${index}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{event.name}</p><p className="truncate text-xs text-muted">{event.email}</p></div>
              <time className="shrink-0 text-[10px] text-muted">{dateTime(event.logged_in_at)}</time>
            </div>
          ))}</div> : <p className="py-8 text-center text-sm text-muted">No successful user logins recorded yet.</p>}
        </Card>
      </div>
      </>}

      {activeSection === 'administration' && <>
        <Card className="animate-fade-in-up">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><UserPlus size={19} /></span>
            <div><h2 className="font-semibold text-ink">Add an administrator</h2><p className="mt-1 text-xs leading-relaxed text-muted">Admin accounts can view usage and create additional admins.</p></div>
          </div>
          <form onSubmit={handleCreateAdmin} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:items-end">
            <Input label="Full name" name="name" value={form.name} onChange={updateForm} autoComplete="name" minLength={2} maxLength={120} required />
            <Input label="Email" name="email" type="email" value={form.email} onChange={updateForm} autoComplete="email" maxLength={255} required />
            <Input label="Temporary password" name="password" type="password" value={form.password} onChange={updateForm} autoComplete="new-password" minLength={8} maxLength={128} required />
            <Button type="submit" loading={creating} className="w-full"><UserPlus size={16} /> Create admin account</Button>
          </form>
          <p className="mt-3 text-[10px] leading-relaxed text-muted">Share the temporary password securely. The new administrator can use it to sign in.</p>
        </Card>
      </>}

      {activeSection === 'questions' && <>
      <Card className="animate-fade-in-up" padded={false}>
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center gap-2"><HelpCircle size={17} className="text-primary" /><h2 className="font-semibold text-ink">Interview question bank</h2></div>
          <p className="mt-1 text-xs text-muted">Add questions for technical and HR interviews. Required questions are included in every interview.</p>
        </div>
        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(300px,0.85fr)_1.15fr]">
          <form onSubmit={handleCreateQuestion} className="space-y-3">
            <label className="block text-xs font-medium text-ink">Question text
              <textarea name="questionText" value={questionForm.questionText} onChange={updateQuestionForm} minLength={10} maxLength={600} rows={3} required placeholder="Write the interview question..." className="mt-1.5 w-full resize-y rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-ink">Interview type
                <select name="mode" value={questionForm.mode} onChange={updateQuestionForm} className="mt-1.5 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink"><option>Technical</option><option>HR</option><option>Both</option></select>
              </label>
              <label className="block text-xs font-medium text-ink">Domain
                <select name="domain" value={questionForm.domain} onChange={updateQuestionForm} className="mt-1.5 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink">{QUESTION_DOMAINS.map((domain) => <option key={domain}>{domain}</option>)}</select>
              </label>
              <label className="block text-xs font-medium text-ink">Difficulty
                <select name="difficulty" value={questionForm.difficulty} onChange={updateQuestionForm} className="mt-1.5 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink"><option>Easy</option><option>Medium</option><option>Hard</option></select>
              </label>
              <label className="block text-xs font-medium text-ink">Category
                <input name="category" value={questionForm.category} onChange={updateQuestionForm} maxLength={80} placeholder="e.g. Communication" className="mt-1.5 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/60" />
              </label>
            </div>
            <label className="block text-xs font-medium text-ink">Sample answer guidance <span className="font-normal text-muted">(optional)</span>
              <textarea name="sampleAnswer" value={questionForm.sampleAnswer} onChange={updateQuestionForm} maxLength={3000} rows={2} placeholder="Key points to look for when evaluating an answer" className="mt-1.5 w-full resize-y rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/60" />
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-ink">
              <input type="checkbox" name="isCompulsory" checked={questionForm.isCompulsory} onChange={updateQuestionForm} className="mt-0.5 accent-primary" />
              <span><strong className="block">Ask this in every interview</strong><span className="mt-0.5 block text-muted">Required questions count toward the user’s selected question total.</span></span>
            </label>
            <Button type="submit" loading={addingQuestion} className="w-full"><Plus size={16} /> Add question</Button>
          </form>

          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">Question list</h3>
              <Badge variant="secondary">{questions.length} questions · {questions.filter((question) => question.is_compulsory).length} required</Badge>
            </div>
            {questions.length ? <div className="max-h-[560px] overflow-y-auto rounded-xl border border-line">
              <div className="divide-y divide-line">{questions.map((question) => (
                <div key={question.id} className="flex items-start justify-between gap-3 p-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-relaxed text-ink">{question.question_text}</p>
                    <p className="mt-1 text-[11px] text-muted">{question.mode} · {question.domain} · {question.difficulty}{question.category ? ` · ${question.category}` : ''}</p>
                  </div>
                  {question.is_compulsory && <Badge variant="primary">Required</Badge>}
                </div>
              ))}</div>
            </div> : <p className="rounded-xl border border-line py-10 text-center text-sm text-muted">No questions have been added yet.</p>}
          </div>
        </div>
      </Card>
      </>}

      {activeSection === 'administration' && <>
      <Card className="animate-fade-in-up" padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
          <div><h2 className="font-semibold text-ink">Account directory</h2><p className="mt-1 text-xs text-muted">Latest 100 PrepNova accounts</p></div>
          <Badge variant="secondary">{accounts.length} accounts</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-panel2 text-[10px] uppercase tracking-wide text-muted"><tr><th className="px-5 py-3 font-semibold">Account</th><th className="px-4 py-3 font-semibold">Role</th><th className="px-4 py-3 font-semibold">Joined</th><th className="px-4 py-3 font-semibold">Last login</th><th className="px-4 py-3 text-right font-semibold">Logins</th><th className="px-5 py-3 text-right font-semibold">Actions</th></tr></thead>
            <tbody className="divide-y divide-line">{accounts.map((account) => (
              <tr key={account.id} className="transition hover:bg-panel2/70">
                <td className="px-5 py-3"><p className="font-medium text-ink">{account.name}</p><p className="mt-0.5 text-muted">{account.email}</p></td>
                <td className="px-4 py-3"><Badge variant={account.role === 'admin' ? 'primary' : 'secondary'}>{account.role}</Badge></td>
                <td className="px-4 py-3 text-muted">{dateTime(account.created_at)}</td>
                <td className="px-4 py-3 text-muted">{dateTime(account.last_login_at)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{Number(account.login_count || 0).toLocaleString()}</td>
                <td className="px-5 py-3 text-right">
                  {Number(account.id) === Number(user?.id) ? (
                    <span className="text-[10px] text-muted">Current account</span>
                  ) : (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      loading={deletingId === account.id}
                      disabled={deletingId !== null}
                      onClick={() => handleDeleteAccount(account)}
                      aria-label={`Delete ${account.name}'s account`}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      </>}

      {activeSection === 'leaderboard' && <>
      <Card className="animate-fade-in-up border-danger/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger"><RotateCcw size={19} /></span>
            <div>
              <h2 className="font-semibold text-ink">Reset leaderboard</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">Start a fresh ranking period. Existing standings will clear, while user accounts, interview history, and reports are preserved.</p>
              <p className="mt-2 text-[11px] text-muted">Last reset: <span className="font-medium text-ink">{stats?.leaderboardResetAt ? dateTime(stats.leaderboardResetAt) : 'Never'}</span></p>
            </div>
          </div>
          <Button type="button" variant="danger" loading={resettingLeaderboard} disabled={resettingLeaderboard} onClick={handleResetLeaderboard} className="shrink-0">
            <RotateCcw size={15} /> Reset standings
          </Button>
        </div>
      </Card>

      <Card className="animate-fade-in-up" padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div><div className="flex items-center gap-2"><Trophy size={17} className="text-primary" /><h2 className="font-semibold text-ink">Current leaderboard</h2></div><p className="mt-1 text-xs text-muted">Candidate standings since the last reset, ranked by score and then completion time.</p></div>
          <Badge variant="secondary">{leaderboardCount} candidates</Badge>
        </div>
        {leaderboardLoading ? <div className="flex justify-center py-12"><Loader /></div> : leaderboard.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-panel2 text-[10px] uppercase tracking-wide text-muted"><tr><th className="px-5 py-3 font-semibold">Rank</th><th className="px-4 py-3 font-semibold">Candidate</th><th className="px-4 py-3 font-semibold">Domain</th><th className="px-4 py-3 text-right font-semibold">Score</th><th className="px-4 py-3 text-right font-semibold">Time</th><th className="px-5 py-3 text-right font-semibold">Completed</th></tr></thead>
              <tbody className="divide-y divide-line">{leaderboard.map((entry) => (
                <tr key={entry.user_id} className="transition-colors hover:bg-panel2/60">
                  <td className="px-5 py-3 font-bold tabular-nums text-primary">#{entry.rank}</td>
                  <td className="px-4 py-3"><p className="font-medium text-ink">{entry.name}</p><p className="mt-0.5 text-[10px] text-muted">{entry.headline || entry.mode}</p></td>
                  <td className="px-4 py-3 text-muted">{entry.domain} · {entry.difficulty}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-ink">{entry.score}%</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-ink">{formatDuration(entry.elapsed_seconds)}</td>
                  <td className="px-5 py-3 text-right text-muted">{dateTime(entry.completed_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="px-5 py-12 text-center"><Trophy size={28} className="mx-auto mb-2 text-muted/60" /><p className="text-sm font-medium text-ink">No leaderboard entries yet</p><p className="mt-1 text-xs text-muted">Completed interviews will appear here.</p></div>}
        {leaderboardCount > leaderboard.length && <p className="border-t border-line px-5 py-3 text-center text-xs text-muted">Showing the top 50 candidates.</p>}
      </Card>
      </>}
    </div>
  )
}
