import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'
import PageHeader from '../components/PageHeader'
import { BriefcaseBusiness, Download, FileText, Repeat2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function InterviewResults() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [exporting, setExporting] = useState('')
  const { user } = useAuth()

  const handleRetry = async () => {
    setRetrying(true)
    try {
      const { data: retry } = await api.post(`/interviews/${id}/retry`)
      navigate(`/interview/start/${retry.interviewId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start focused practice')
    } finally {
      setRetrying(false)
    }
  }

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <p className="mb-4 text-muted">No results to show.</p>
        <Button onClick={() => navigate('/interview/setup')}>Start New Interview</Button>
      </Card>
    )
  }

  const { interview, evaluation } = data
  const overallScore = evaluation.overallScore
  const totalQuestions = evaluation.totalQuestions ?? interview.questions?.length ?? 0
  const answeredCount = evaluation.answeredCount ?? interview.questions?.filter((question) => question.answer?.answer_text?.trim()).length ?? 0
  const qTextById = new Map((interview.questions || []).map((q) => [String(q.id), q.question_text]))
  const questionEvaluations = evaluation.questionEvaluations || []
  const retryCount = questionEvaluations.filter((question) => Number(question.score) < 7).length || Math.min(3, questionEvaluations.length)

  const handleDownloadReport = async (format) => {
    setExporting(format)
    try {
      const exporter = await import('../services/reportExport.js')
      if (format === 'pdf') {
        await exporter.downloadInterviewPdf(interview, evaluation, user?.name)
      } else {
        await exporter.downloadInterviewDocx(interview, evaluation, user?.name)
      }
      toast.success(`${format.toUpperCase()} report downloaded`)
    } catch (err) {
      console.error('Report export failed', err)
      toast.error(`Could not create the ${format.toUpperCase()} report`)
    } finally {
      setExporting('')
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon="📊"
        title="Interview Results"
        subtitle={`${interview.mode} · ${interview.domain} · ${interview.difficulty}`}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{overallScore}%</Badge>
            <Button size="sm" variant="outline" loading={exporting === 'pdf'} disabled={Boolean(exporting)} onClick={() => handleDownloadReport('pdf')}>
              <Download size={15} /> PDF
            </Button>
            <Button size="sm" variant="outline" loading={exporting === 'docx'} disabled={Boolean(exporting)} onClick={() => handleDownloadReport('docx')}>
              <FileText size={15} /> DOCX
            </Button>
          </div>
        )}
      />
      {interview.targetRole && (
        <Card className="mb-6 flex items-start gap-3 border-primary/20 bg-primary/5 animate-fade-in-up">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BriefcaseBusiness size={17} /></span>
          <div>
            <p className="text-sm font-semibold text-ink">Feedback for {interview.targetRole}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{evaluation.source === 'ai' ? (interview.jobDescription ? 'Your answers were reviewed against the role brief you provided.' : 'Your answers were reviewed with this target role in mind.') : 'This role guided your question selection. Enable AI evaluation to receive role-specific feedback.'}</p>
          </div>
        </Card>
      )}
      {/* Score hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-indigo-500 to-secondary text-white p-8 mb-6 animate-fade-in">
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl animate-float" aria-hidden="true" />
          <p className="text-sm text-white/80 mb-1">Overall Performance</p>
          <p className="mb-2 text-center text-xs text-white/75">{answeredCount} of {totalQuestions} questions answered · unanswered questions count as 0</p>
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
            <h3 className="font-semibold text-ink mb-2">Summary</h3>
            <p className="text-sm text-muted animate-fade-in">{evaluation.summary}</p>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {(evaluation.strengths || []).length > 0 && (
            <Card hover className="animate-fade-in-up">
              <h3 className="font-semibold text-success mb-2">✅ Strengths</h3>
              <ul className="list-disc list-inside text-sm text-muted space-y-1">
                {evaluation.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
          )}
          {(evaluation.weaknesses || []).length > 0 && (
            <Card hover className="animate-fade-in-up">
              <h3 className="font-semibold text-danger mb-2">⚠️ Weaknesses</h3>
              <ul className="list-disc list-inside text-sm text-muted space-y-1">
                {evaluation.weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
          )}
          {(evaluation.improvements || []).length > 0 && (
            <Card hover className="animate-fade-in-up">
              <h3 className="font-semibold text-warning mb-2">🔧 Improvements</h3>
              <ul className="list-disc list-inside text-sm text-muted space-y-1">
                {evaluation.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <h2 className="text-lg font-semibold text-ink mb-3">Question Breakdown</h2>
        <div className="flex flex-col gap-4">
          {questionEvaluations.map((e) => (
            <Card key={e.questionId} hover className="animate-fade-in-up">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-ink">
                  Q{e.questionNumber}: {qTextById.get(String(e.questionId)) || 'Question'}
                </p>
                <Badge variant={e.score >= 8 ? 'success' : e.score >= 6 ? 'warning' : 'danger'}>
                  {e.score}/10
                </Badge>
              </div>
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-panel2">
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
              <p className="text-sm text-muted">{e.feedback}</p>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button variant="secondary" onClick={handleRetry} loading={retrying} className="w-full" disabled={retryCount === 0}>
            <Repeat2 size={16} /> Practice {retryCount} focus {retryCount === 1 ? 'question' : 'questions'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/interview/history')} className="flex-1">
            View History
          </Button>
          <Button onClick={() => navigate('/interview/setup')} className="flex-1">
            New Interview
          </Button>
        </div>
    </div>
  )
}
