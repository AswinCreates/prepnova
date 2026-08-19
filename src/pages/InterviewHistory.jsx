import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { getSessions } from '../utils/sessionStorage'

export default function InterviewHistory() {
  const sessions = getSessions()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Interview History</h1>
          <Button onClick={() => navigate('/interview/setup')}>New Interview</Button>
        </div>

        {sessions.length === 0 ? (
          <Card className="text-center text-gray-500">
            No interviews completed yet. Start your first one!
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {sessions.map((s) => {
              const variant = s.overallScore >= 80 ? 'success' : s.overallScore >= 50 ? 'warning' : 'danger'
              return (
                <Card key={s.id} className="flex justify-between items-center">
                  <div>
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
                  <Badge variant={variant}>{s.overallScore}%</Badge>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}