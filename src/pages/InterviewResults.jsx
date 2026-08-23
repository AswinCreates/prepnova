import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'

export default function InterviewResults() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get(`/interviews/${id}/results`)
      .then((res) => {
        if (active) setData(res.data)
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Could not load results')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

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

  if (!data) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="max-w-lg mx-auto p-6 text-center">
          <p className="text-gray-500 mb-4">No results to show.</p>
          <Button onClick={() => navigate('/interview/setup')}>Start New Interview</Button>
        </div>
      </div>
    )
  }

  const { interview, evaluation } = data
  const overallScore = evaluation.overallScore
  const qTextById = new Map((interview.questions || []).map((q) => [String(q.id), q.question_text]))
  const questionEvaluations = evaluation.questionEvaluations || []

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 animate-fade-in-up">
        {/* Score hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-indigo-500 to-secondary text-white p-8 mb-6 animate-fade-in">
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl animate-float" aria-hidden="true" />
          <p className="text-sm text-white/80 mb-1">Overall Performance</p>
          <div className="flex items-center justify-center gap-3">
            <div className="relative h-24 w-24" aria-hidden="true">
              <svg viewBox="0 0 100 100" className="h-24 w-24">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${overallScore * 2.51} 251.6`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white">
                {overallScore}%
              </span>
            </div>
          </div>
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            <Badge>{interview.mode}</Badge>
            <Badge variant="secondary">{interview.domain}</Badge>
            <Badge variant="warning">{interview.difficulty}</Badge>
          </div>
          <p className="text-center mt-3 font-medium text-white/90">
            {overallScore >= 80 ? '🏆 Great job!' : overallScore >= 50 ? '💪 Good effort' : '📚 Needs practice'}
          </p>
          {evaluation.source ? (
            <p className="text-center text-xs text-white/60 mt-1">
              {evaluation.source === 'ai' ? '✨ Evaluated with AI' : 'Evaluated with built-in scoring (AI unavailable)'}
            </p>
          ) : null}
        </div>

        {evaluation.summary ? (
          <Card className="mb-6 animate-fade-in-up">
            <h3 className="font-semibold text-gray-800 mb-2">Summary</h3>
            <p className="text-sm text-gray-600 animate-fade-in">{evaluation.summary}</p>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {(evaluation.strengths || []).length > 0 && (
            <Card hover className="animate-fade-in-up">
              <h3 className="font-semibold text-success mb-2">✅ Strengths</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {evaluation.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
          )}
          {(evaluation.weaknesses || []).length > 0 && (
            <Card hover className="animate-fade-in-up">
              <h3 className="font-semibold text-danger mb-2">⚠️ Weaknesses</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {evaluation.weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
          )}
          {(evaluation.improvements || []).length > 0 && (
            <Card hover className="animate-fade-in-up">
              <h3 className="font-semibold text-warning mb-2">🔧 Improvements</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {evaluation.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-3">Question Breakdown</h2>
        <div className="flex flex-col gap-4">
          {questionEvaluations.map((e) => (
            <Card key={e.questionId} hover className="animate-fade-in-up">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-gray-800">
                  Q{e.questionNumber}: {qTextById.get(String(e.questionId)) || 'Question'}
                </p>
                <Badge variant={e.score >= 8 ? 'success' : e.score >= 6 ? 'warning' : 'danger'}>
                  {e.score}/10
                </Badge>
              </div>
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full bg-gradient-to-r ${
                    e.score >= 8
                      ? 'from-success to-emerald-400'
                      : e.score >= 6
                      ? 'from-warning to-amber-400'
                      : 'from-danger to-rose-400'
                  } rounded-full transition-all duration-700`}
                  style={{ width: `${e.score * 10}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{e.feedback}</p>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => navigate('/interview/history')} className="flex-1">
            View History
          </Button>
          <Button onClick={() => navigate('/interview/setup')} className="flex-1">
            New Interview
          </Button>
        </div>
      </div>
    </div>
  )
}