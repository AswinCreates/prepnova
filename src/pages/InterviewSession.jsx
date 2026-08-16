import { useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { useTimer } from '../hooks/useTimer'
import { mockQuestions } from '../utils/mockQuestions'

const SECONDS_PER_QUESTION = 90

export default function InterviewSession() {
  const location = useLocation()
  const navigate = useNavigate()
  const { domain, difficulty, mode } = location.state || {}

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [answers, setAnswers] = useState([])

  const question = mockQuestions[currentIndex]
  const isLastQuestion = currentIndex === mockQuestions.length - 1

    const handleNext = useCallback(() => {
        const updatedAnswers = [...answers, { questionId: question.id, answer }]
        setAnswers(updatedAnswers)

        if (isLastQuestion) {
            toast.success('Interview completed!')
            navigate('/interview/results', {
                state: { domain, difficulty, mode, answers: updatedAnswers },
            })
            return
        }

    setCurrentIndex((i) => i + 1)
    setAnswer('')
    reset(SECONDS_PER_QUESTION)
  }, [answer, question, isLastQuestion])

  const { formatted, reset } = useTimer(SECONDS_PER_QUESTION, handleNext)

  if (!question) {
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

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <Badge variant="secondary">
            Question {currentIndex + 1} of {mockQuestions.length}
          </Badge>
          <Badge variant={formatted < '0:20' ? 'danger' : 'warning'}>⏱ {formatted}</Badge>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-gray-800 mb-6">{question.text}</h2>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={8}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />

          <div className="flex justify-end mt-4">
            <Button onClick={handleNext}>
              {isLastQuestion ? 'Finish Interview' : 'Next Question'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}