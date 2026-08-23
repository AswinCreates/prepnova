import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([api.get('/dashboard/stats'), api.get('/interviews/history')])
      .then(([statsRes, historyRes]) => {
        if (!active) return
        setStats(statsRes.data)
        setRecent((historyRes.data.sessions || []).slice(0, 3))
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
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="max-w-2xl mx-auto p-6 flex justify-center">
          <Loader size="lg" />
        </div>
      </div>
    )
  }

  const totalSessions = stats?.stats?.totalSessions ?? 0
  const avgScore = stats?.stats?.avgScore ?? 0
  const bestScore = stats?.stats?.bestScore ?? 0
  const timeline = (stats?.timeline || []).map((t, i) => ({
    name: `#${i + 1}`,
    score: t.score,
  }))

  const statCards = [
    { label: 'Sessions', value: totalSessions, icon: '🎯', grad: 'from-primary to-indigo-400' },
    { label: 'Avg Score', value: `${avgScore}%`, icon: '📈', grad: 'from-secondary to-emerald-400' },
    { label: 'Best Score', value: `${bestScore}%`, icon: '🏆', grad: 'from-amber-400 to-warning' },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 animate-fade-in-up">
        {/* Hero card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-indigo-500 to-secondary text-white p-6">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl animate-float" aria-hidden="true" />
          <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-2xl animate-float" aria-hidden="true" />
          <h2 className="text-2xl font-bold mb-1">Ready to practice?</h2>
          <p className="text-sm text-white/80 mb-4">Start a new mock interview session and sharpen your skills</p>
          <Button
            onClick={() => navigate('/interview/setup')}
            className="bg-white text-primary-dark hover:bg-gray-100"
          >
            🚀 New Interview
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {statCards.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl bg-gradient-to-br from-white to-white/90 border border-gray-100 p-5 animate-fade-in-up"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-800">{c.value}</span>
                <span className="text-2xl" aria-hidden="true">{c.icon}</span>
              </div>
              <div className={`h-1.5 w-full bg-gradient-to-r ${c.grad} rounded-full opacity-40`} />
              <p className="mt-2 text-sm text-gray-500">{c.label}</p>
            </div>
          ))}
        </div>

        {timeline.length > 0 && (
          <Card className="mb-6 animate-fade-in-up">
            <h3 className="font-semibold text-gray-800 mb-4">Progress Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeline}>
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#4F46E5' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Recent Sessions</h3>
          <Button variant="outline" onClick={() => navigate('/interview/history')}>
            View All
          </Button>
        </div>

        {recent.length === 0 ? (
          <Card className="text-center text-gray-500 animate-fade-in-up">
            No interviews completed yet. Start your first one!
          </Card>
        ) : (
          recent.map((s) => (
            <Card
              key={s.id}
              hover
              className="flex justify-between items-center mb-3 cursor-pointer animate-fade-in-up"
              onClick={() => navigate(`/interview/results/${s.id}`)}
            >
              <div className="flex gap-2">
                <Badge>{s.mode}</Badge>
                <Badge variant="secondary">{s.domain}</Badge>
                <Badge variant="warning">{s.difficulty}</Badge>
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
    </div>
  )
}