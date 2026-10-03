import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'
import SpeechInterview from '../components/SpeechInterview'
import { useTimer } from '../hooks/useTimer'
import { getQuestionTimeLimit } from '../utils/interviewTiming'
import { CheckCircle2, ClipboardCheck, MessageSquareText, Sparkles } from 'lucide-react'

export default function InterviewSession() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [answerMode, setAnswerMode] = useState('typed')
  const [answers, setAnswers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(getQuestionTimeLimit('Medium'))

  const current = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1

  const { secondsLeft, formatted, reset } = useTimer(secondsPerQuestion, () => handleNext())

  useEffect(() => {
    let active = true
    api
      .get(`/interviews/${id}`)
      .then((res) => {
        if (!active) return
        const iv = res.data.interview
        const questionTimeLimit = getQuestionTimeLimit(iv.difficulty)
        setSecondsPerQuestion(questionTimeLimit)
        reset(questionTimeLimit)
        setQuestions(iv.questions || [])
        if (iv.status === 'completed') {
          navigate(`/interview/results/${id}`, { replace: true })
          return
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Could not load the interview')
        if (active) navigate('/interview/setup', { replace: true })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const submitAndComplete = async (finalAnswers) => {
    if (submitting) return
    const startedAt = Date.now()
    setSubmitting(true)
    try {
      await api.post(`/interviews/${id}/complete`, { answers: finalAnswers })
      const visibleFor = Date.now() - startedAt
      if (visibleFor < 1000) await new Promise((resolve) => setTimeout(resolve, 1000 - visibleFor))
      toast.success('Interview completed!')
      navigate(`/interview/results/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit your interview')
      setSubmitting(false)
    }
  }

  function handleNext() {
    if (!current || submitting) return
    const entry = {
      questionId: current.id,
      answerText: answer,
      answerMode,
      timeTakenSeconds: Math.max(0, secondsPerQuestion - secondsLeft),
    }
    const updatedAnswers = [...answers, entry]
    setAnswers(updatedAnswers)

    if (isLastQuestion) {
      submitAndComplete(updatedAnswers)
      return
    }
    setCurrentIndex((i) => i + 1)
    setAnswer('')
    setAnswerMode('typed')
    reset(secondsPerQuestion)
  }

  const handleVoiceAnswer = (text) => {
    setAnswer(text)
    setAnswerMode('voice')
  }
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  if (submitting) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center animate-fade-in">
        <Card className="w-full max-w-lg px-7 py-10 text-center sm:px-10">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary animate-pulse">
            <Sparkles size={25} />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Interview complete</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Preparing your report</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            We’re reviewing your answers and putting together your score and feedback.
          </p>
          <div className="my-7 flex justify-center"><Loader size="md" /></div>
          <div className="space-y-3 rounded-xl border border-line bg-panel2 p-4 text-left">
            <p className="flex items-center gap-3 text-xs text-ink"><MessageSquareText size={16} className="text-primary" /> Reviewing {answers.length + 1} interview responses</p>
            <p className="flex items-center gap-3 text-xs text-ink"><ClipboardCheck size={16} className="text-primary" /> Organizing your question-by-question feedback</p>
          </div>
          <p className="mt-5 text-[11px] text-muted">This can take a moment. Please keep this page open.</p>
        </Card>
      </div>
    )
  }

  if (!current) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <p className="mb-4 text-muted">No active interview session.</p>
        <Button onClick={() => navigate('/interview/setup')}>Start New Interview</Button>
      </Card>
    )
  }

  const progressPct = Math.round((secondsLeft / secondsPerQuestion) * 100)

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <Badge variant="secondary">
          Question {currentIndex + 1} of {questions.length}
        </Badge>
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              secondsLeft <= 20 ? 'bg-danger animate-pulse' : 'bg-warning'
            }`}
          />
          <span
            className={`text-sm font-semibold tabular-nums ${
              secondsLeft <= 20 ? 'text-danger' : 'text-amber-500 dark:text-amber-300'
            }`}
          >
            ⏱ {formatted}
          </span>
        </div>
      </div>

      {/* Timer progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-panel2">
        <div
          className={`h-full bg-gradient-to-r ${
            secondsLeft <= 20 ? 'from-danger to-rose-400' : 'from-primary to-secondary'
          } transition-all duration-1000`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <Card className="animate-fade-in-up">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {current.category || 'Interview Question'}
          </p>
          <h2 key={current.id} className="mt-1 text-xl font-bold text-ink animate-pop-in">
            {current.question_text}
          </h2>

          {current.question_type === 'mcq' ? (
            <fieldset className="mt-5 space-y-2">
              <legend className="mb-3 text-xs font-semibold text-muted">Choose one answer</legend>
              {(current.options || []).map((option, index) => {
                const selected = answer === option
                return (
                  <label key={`${current.id}-${index}`} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm transition-colors ${selected ? 'border-primary bg-primary/5 text-ink ring-2 ring-primary/15' : 'border-line bg-panel text-ink hover:border-primary/40'}`}>
                    <input type="radio" name={`answer-${current.id}`} checked={selected} onChange={() => { setAnswer(option); setAnswerMode('typed') }} className="h-4 w-4 accent-primary" />
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-panel2 text-[11px] font-semibold text-muted">{String.fromCharCode(65 + index)}</span>
                    <span className="flex-1">{option}</span>
                    {selected && <CheckCircle2 size={16} className="text-primary" />}
                  </label>
                )
              })}
            </fieldset>
          ) : <>
          {/* Typed / Voice toggle */}
          <div className="mb-4 mt-4 inline-flex rounded-xl border border-line bg-panel2 p-1">
            <button
              type="button"
              onClick={() => setAnswerMode('typed')}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                answerMode === 'typed'
                  ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/25'
                  : 'text-muted hover:text-ink'
              }`}
            >
              ⌨️ Typed
            </button>
            <button
              type="button"
              onClick={() => setAnswerMode('voice')}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                answerMode === 'voice'
                  ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/25'
                  : 'text-muted hover:text-ink'
              }`}
            >
              🎙️ Voice
            </button>
          </div>

          {answerMode === 'voice' ? (
            <SpeechInterview question={current.question_text} onAnswerSubmitted={handleVoiceAnswer} />
          ) : (
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={8}
              className="w-full resize-none rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
            />
          )}
          </>}

          {answerMode === 'voice' && answer.trim() ? (
            <p className="mt-3 text-xs text-muted animate-fade-in">
              ✅ Voice answer captured for this question. Press next when ready.
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted">
              {answer.trim() ? 'Answer ready' : 'No answer yet'}
            </span>
            <Button onClick={handleNext} loading={submitting} disabled={submitting}>
              {isLastQuestion ? 'Finish Interview' : 'Next Question →'}
            </Button>
          </div>
        </Card>
    </div>
  )
}
