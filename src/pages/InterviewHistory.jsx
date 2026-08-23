import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'

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
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="max-w-2xl mx-auto p-6 flex justify-center">
          <Loader size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 animate-fade-in-up">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Interview History
          </h1>
          <Button onClick={() => navigate('/interview/setup')}>New Interview</Button>
        </div>

        {sessions.length === 0 ? (
          <Card className="text-center text-gray-500 animate-fade-in-up">
            No interviews completed yet. Start your first one!
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {sessions.map((s) => {
              const variant =
                s.total_score >= 80 ? 'success' : s.total_score >= 50 ? 'warning' : 'danger'
              return (
                <Card
                  key={s.id}
                  hover
                  className="flex justify-between items-center cursor-pointer animate-fade-in-up"
                  onClick={() => navigate(`/interview/results/${s.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex gap-2 mb-1">
                      <Badge>{s.mode}</Badge>
                      <Badge variant="secondary">{s.domain}</Badge>
                      <Badge variant="warning">{s.difficulty}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(s.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-primary to-secondary">
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
    </div>
  )
}