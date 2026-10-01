import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'
import PageHeader from '../components/PageHeader'
import { formatTimeLimit, getQuestionTimeLimit } from '../utils/interviewTiming'

export default function InterviewStart() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get(`/interviews/${id}`)
      .then((res) => {
        if (active) setInterview(res.data.interview)
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Could not load interview')
        if (active) navigate('/interview/setup', { replace: true })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, navigate])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  if (!interview) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <p className="mb-4 text-muted">No interview found.</p>
        <Button onClick={() => navigate('/interview/setup')}>Go to Setup</Button>
      </Card>
    )
  }

  const isCompleted = interview.status === 'completed'

  const handleStart = () => {
    navigate(`/interview/session/${id}`)
  }

  const details = [
    { label: 'Mode', badge: interview.mode, variant: 'primary' },
    { label: 'Domain', badge: interview.domain, variant: 'secondary' },
    { label: 'Difficulty', badge: interview.difficulty, variant: 'warning' },
    ...(interview.targetRole ? [{ label: 'Target role', badge: interview.targetRole, variant: 'primary' }] : []),
    { label: 'Questions', badge: interview.questions?.length ?? 0, variant: 'success' },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader icon="🎬" title="Ready when you are" subtitle="Review your session details before starting" />

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-2 text-xs font-medium">
        {['Configure', 'Review', 'Interview', 'Results'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                i <= 1 ? 'bg-gradient-to-br from-primary to-primary-dark text-white' : 'bg-panel2 text-muted'
              }`}
            >
              {i + 1}
            </span>
            <span className={i <= 1 ? 'text-ink' : 'text-muted'}>{step}</span>
            {i < 3 && <span className="mx-1 hidden h-px w-6 bg-line sm:block" />}
          </div>
        ))}
      </div>

      <Card className="animate-fade-in-up">
        <div className="mb-6 flex flex-col gap-3">
          {details.map((d) => (
            <div key={d.label} className="flex items-center justify-between">
              <span className="text-sm text-muted">{d.label}</span>
              <Badge variant={d.variant}>{d.badge}</Badge>
            </div>
          ))}
        </div>

        <div className="mb-6 rounded-xl border border-line bg-primary/5 p-4 text-sm text-muted">
          <p className="mb-1 font-medium text-ink">{interview.targetRole ? `Focused practice for ${interview.targetRole}` : 'Before you begin:'}</p>
          {interview.jobDescription && <p className="mb-2 line-clamp-3 text-xs leading-relaxed">Your role brief is included in your evaluation so feedback can reflect the work you are targeting.</p>}
          <ul className="list-inside list-disc space-y-1">
            <li>Each question is timed ({formatTimeLimit(getQuestionTimeLimit(interview.difficulty))} for {interview.difficulty.toLowerCase()} difficulty)</li>
            <li>Answer by typing or speaking (voice: Chrome/Edge)</li>
            <li>You'll get an evaluated score with feedback at the end</li>
          </ul>
        </div>

        {isCompleted ? (
          <Button onClick={() => navigate(`/interview/results/${id}`)} className="w-full" size="lg">
            View Results
          </Button>
        ) : (
          <Button onClick={handleStart} className="w-full" size="lg">
            🚀 Start Interview
          </Button>
        )}
      </Card>
    </div>
  )
}
