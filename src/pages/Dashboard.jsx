import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, Award, Compass, Hand, Plus, Target, TrendingUp } from 'lucide-react'

function ProgressTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const date = new Date(point.date)
  if (Number.isNaN(date.getTime())) return null

  const dateLabel = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
  const timeLabel = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)

  return (
    <div className="rounded-xl border border-line bg-panel px-3.5 py-3 shadow-lg">
      <p className="text-xs font-semibold text-ink">{dateLabel}</p>
      <p className="mt-0.5 text-xs text-muted">{timeLabel}</p>
      <p className="mt-2 text-xs font-medium text-primary">Score: {point.score}%</p>
      <p className="mt-0.5 text-[11px] text-muted">{point.domain} · {point.difficulty}</p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([api.get('/dashboard/stats'), api.get('/interviews/history')])
      .then(([statsRes, historyRes]) => {
        if (!active) return
        setStats(statsRes.data)
        setRecent((historyRes.data.sessions || []).slice(0, 4))
      })
      .catch((err) => {
        console.error('Dashboard load failed', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  const totalSessions = stats?.stats?.totalSessions ?? 0
  const avgScore = stats?.stats?.avgScore ?? 0
  const bestScore = stats?.stats?.bestScore ?? 0
  const domains = stats?.domainDistribution || []
  const timeline = (stats?.timeline || []).map((t, i) => ({
    name: `#${i + 1}`,
    score: t.score,
    date: t.date,
    domain: t.domain,
    difficulty: t.difficulty,
  }))

  const statCards = [
    { label: 'Sessions', value: totalSessions, icon: <Target className="text-primary" /> },
    { label: 'Average', value: `${avgScore}%`, icon: <TrendingUp className="text-secondary" /> },
    { label: 'Best Score', value: `${bestScore}%`, icon: <Award className="text-warning" /> },
    { label: 'Domains', value: domains.length, icon: <Compass className="text-primary" /> },
  ]

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<Hand size={20} />}
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle={today}
        actions={<Button onClick={() => navigate('/interview/setup')}><Plus size={16} /> New Interview</Button>}
      />

      {/* Hero CTA */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-linear-to-br from-primary via-indigo-500 to-secondary p-6 text-white animate-fade-in-up">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl animate-float" aria-hidden="true" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-2xl animate-float" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Ready to practice?</h2>
            <p className="text-sm text-white/80">Start a mock interview — type or speak your answers.</p>
          </div>
          <Button
            onClick={() => navigate('/interview/setup')}
            className="!bg-white !text-[#115953] shadow-lg shadow-black/10 hover:bg-[#f1f5f1]"
          >
            <><ArrowRight size={16} /> Start now</>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((c) => (
          <Card key={c.label} hover className="animate-fade-in-up">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-ink">{c.value}</span>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-panel2">{c.icon}</span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-primary/30" />
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
          </Card>
        ))}
      </div>

      {/* Chart + domain coverage */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-fade-in-up">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-ink">Progress Over Time</h3>
            <Badge variant="primary">last {timeline.length}</Badge>
          </div>
          {timeline.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              Complete an interview to see your score trend.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timeline} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--pn-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--pn-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--pn-muted)" fontSize={12} domain={[0, 100]} tickLine={false} />
                <Tooltip content={<ProgressTooltip />} cursor={{ stroke: 'var(--pn-border)', strokeDasharray: '4 4' }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#176F68"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#176F68' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="animate-fade-in-up">
          <h3 className="mb-4 font-semibold text-ink">Domain Coverage</h3>
          {domains.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No domains practiced yet.</p>
          ) : (
            <ul className="space-y-3">
              {domains.map((d) => (
                <li key={d.domain}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="truncate font-medium text-ink">{d.domain}</span>
                    <span className="text-muted">{d.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-panel2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                      style={{ width: `${Math.min(100, d.count * 25)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent sessions */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Recent Sessions</h3>
        <Button variant="ghost" onClick={() => navigate('/interview/history')}>
          View all →
        </Button>
      </div>

      {recent.length === 0 ? (
        <Card className="text-center animate-fade-in-up">
          <p className="flex justify-center text-muted"><Target size={28} /></p>
          <p className="mt-2 text-sm text-muted">No interviews completed yet. Start your first one!</p>
          <Button className="mt-4" onClick={() => navigate('/interview/setup')}>
            Start Interview
          </Button>
        </Card>
      ) : (
        recent.map((s) => (
          <Card
            key={s.id}
            hover
            className="mb-3 flex cursor-pointer items-center justify-between animate-fade-in-up"
            onClick={() => navigate(`/interview/results/${s.id}`)}
          >
            <div className="flex flex-wrap gap-2">
              <Badge>{s.mode}</Badge>
              <Badge variant="secondary">{s.domain}</Badge>
              <Badge variant="warning">{s.difficulty}</Badge>
              {s.target_role && <Badge variant="primary">{s.target_role}</Badge>}
            </div>
            <Badge
              variant={s.total_score >= 80 ? 'success' : s.total_score >= 50 ? 'warning' : 'danger'}
            >
              {s.total_score}%
            </Badge>
          </Card>
        ))
      )}
    </div>
  )
}
