import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'
import SpeechInterview from '../components/SpeechInterview'
import { useTimer } from '../hooks/useTimer'

const SECONDS_PER_QUESTION = 90

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

  const current = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1

  const { secondsLeft, formatted, reset } = useTimer(SECONDS_PER_QUESTION, () => handleNext())

  useEffect(() => {
    let active = true
    api
      .get(`/interviews/${id}`)
      .then((res) => {
        if (!active) return
        const iv = res.data.interview
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
    setSubmitting(true)
    try {
      await api.post(`/interviews/${id}/complete`, { answers: finalAnswers })
      toast.success('Interview completed!')
      navigate(`/interview/results/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit your interview')
      setSubmitting(false)
    }
  }

  function handleNext() {
    if (!current) return
    const entry = {
      questionId: current.id,
      answerText: answer,
      answerMode,
      timeTakenSeconds: Math.max(0, SECONDS_PER_QUESTION - secondsLeft),
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
    reset(SECONDS_PER_QUESTION)
  }

  const handleVoiceAnswer = (text) => {
    setAnswer(text)
    setAnswerMode('voice')
  }
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

  if (!current) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="max-w-lg mx-auto p-6 text-center">
          <p className="text-gray-500 mb-4">No active interview session.</p>
          <Button onClick={() => navigate('/interview/setup')}>Start New Interview</Button>
        </div>
      </div>
    )
  }

  const progressPct = Math.round((secondsLeft / SECONDS_PER_QUESTION) * 100)

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
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
                secondsLeft <= 20 ? 'text-danger' : 'text-amber-500'
              }`}
            >
              ⏱ {formatted}
            </span>
          </div>
        </div>

        {/* Timer progress bar */}
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full bg-gradient-to-r ${
              secondsLeft <= 20 ? 'from-danger to-rose-400' : 'from-primary to-secondary'
            } transition-all duration-1000`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <Card className="animate-fade-in-up">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {current.category || 'Interview Question'}
              </p>
              <h2 className="text-xl font-bold text-gray-800 mt-1 animate-pop-in" key={current.id}>
                {current.question_text}
              </h2>
            </div>
          </div>

          {/* Typed / Voice toggle */}
          <div className="flex gap-2 mb-4 mt-4">
            <Button
              variant={answerMode === 'typed' ? 'primary' : 'outline'}
              onClick={() => setAnswerMode('typed')}
            >
              ⌨️ Typed
            </Button>
            <Button
              variant={answerMode === 'voice' ? 'primary' : 'outline'}
              onClick={() => setAnswerMode('voice')}
            >
              🎙️ Voice
            </Button>
          </div>

          {answerMode === 'voice' ? (
            <SpeechInterview question={current.question_text} onAnswerSubmitted={handleVoiceAnswer} />
          ) : (
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={8}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/60 focus:shadow-lg shadow-primary/10 resize-none"
            />
          )}

          {answerMode === 'voice' && answer.trim() ? (
            <p className="mt-3 text-xs text-gray-500 animate-fade-in">
              ✅ Voice answer captured for this question. Press next when ready.
            </p>
          ) : null}

          <div className="flex justify-end mt-4">
            <Button onClick={handleNext} loading={submitting} disabled={submitting}>
              {isLastQuestion ? 'Finish Interview' : 'Next Question'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}