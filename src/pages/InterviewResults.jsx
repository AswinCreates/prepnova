import { useEffect, useMemo } from 'react'
import { saveSession } from '../utils/sessionStorage'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { mockQuestions } from '../utils/mockQuestions'
import { generateMockEvaluation, calculateOverallScore } from '../utils/mockEvaluation'

export default function InterviewResults() {
  const location = useLocation()
  const navigate = useNavigate()
  const { domain, difficulty, mode, answers } = location.state || {}

  const evaluations = useMemo(
    () => (answers ? generateMockEvaluation(answers) : []),
    [answers]
  )
  const overallScore = useMemo(() => calculateOverallScore(evaluations), [evaluations])
  useEffect(() => {
    if (answers && evaluations.length > 0) {
      saveSession({
        id: Date.now(),
        date: new Date().toISOString(),
        mode,
        domain,
        difficulty,
        overallScore,
        evaluations,
      })
    }
  }, [])

  if (!answers) {
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

  const scoreVariant = overallScore >= 80 ? 'success' : overallScore >= 50 ? 'warning' : 'danger'

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <Card className="mb-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Overall Performance</p>
          <h1 className="text-5xl font-bold text-gray-800 mb-2">{overallScore}%</h1>
          <Badge variant={scoreVariant}>
            {overallScore >= 80 ? 'Great job' : overallScore >= 50 ? 'Good effort' : 'Needs practice'}
          </Badge>
          <div className="flex justify-center gap-2 mt-4">
            <Badge>{mode}</Badge>
            <Badge variant="secondary">{domain}</Badge>
            <Badge variant="warning">{difficulty}</Badge>
          </div>
        </Card>

        <h2 className="text-lg font-semibold text-gray-800 mb-3">Question Breakdown</h2>
        <div className="flex flex-col gap-4">
          {evaluations.map((e) => (
            <Card key={e.questionId}>
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-gray-800">
                  Q{e.questionNumber}: {mockQuestions.find((q) => q.id === e.questionId)?.text}
                </p>
                <Badge variant={e.score >= 8 ? 'success' : e.score >= 6 ? 'warning' : 'danger'}>
                  {e.score}/10
                </Badge>
              </div>
              {e.answer && (
                <p className="text-sm text-gray-500 mb-2 italic">"{e.answer}"</p>
              )}
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