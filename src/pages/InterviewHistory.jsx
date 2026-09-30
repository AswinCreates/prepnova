import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'
import PageHeader from '../components/PageHeader'

export default function InterviewHistory() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    api
      .get('/interviews/history')
      .then((res) => {
        if (active) setSessions(res.data.sessions)
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Could not load history')
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

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon="🕘"
        title="Interview History"
        subtitle={`${sessions.length} completed session${sessions.length === 1 ? '' : 's'}`}
        actions={<Button onClick={() => navigate('/interview/setup')}>＋ New Interview</Button>}
      />

      {sessions.length === 0 ? (
        <Card className="text-center animate-fade-in-up">
          <p className="text-3xl">🗂️</p>
          <p className="mt-2 text-sm text-muted">No interviews completed yet.</p>
          <Button className="mt-4" onClick={() => navigate('/interview/setup')}>
            Start your first interview
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => {
            const variant =
              s.total_score >= 80 ? 'success' : s.total_score >= 50 ? 'warning' : 'danger'
            return (
              <Card
                key={s.id}
                hover
                className="flex cursor-pointer items-center justify-between animate-fade-in-up"
                onClick={() => navigate(`/interview/results/${s.id}`)}
              >
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap gap-2">
                    <Badge>{s.mode}</Badge>
                    <Badge variant="secondary">{s.domain}</Badge>
                    <Badge variant="warning">{s.difficulty}</Badge>
                    {s.target_role && <Badge variant="primary">{s.target_role}</Badge>}
                  </div>
                  <p className="text-sm text-muted">
                    {new Date(s.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-panel2 sm:block">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${
                        s.total_score >= 80
                          ? 'from-success to-emerald-400'
                          : s.total_score >= 50
                          ? 'from-warning to-amber-400'
                          : 'from-danger to-rose-400'
                      }`}
                      style={{ width: `${s.total_score}%` }}
                    />
                  </div>
                  <Badge variant={variant}>{s.total_score}%</Badge>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
