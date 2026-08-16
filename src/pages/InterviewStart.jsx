import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'

export default function InterviewStart() {
  const location = useLocation()
  const navigate = useNavigate()
  const { domain, difficulty, mode } = location.state || {}

  if (!domain) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="max-w-lg mx-auto p-6 text-center">
          <p className="text-gray-500 mb-4">No interview setup found.</p>
          <Button onClick={() => navigate('/interview/setup')}>Go to Setup</Button>
        </div>
      </div>
    )
  }

  const handleStart = () => {
    navigate('/interview/session', { state: { domain, difficulty, mode } })
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-lg mx-auto p-6">
        <Card>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">You're all set</h1>
          <p className="text-sm text-gray-500 mb-6">Review your session details before starting</p>

          <div className="flex flex-col gap-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Mode</span>
              <Badge>{mode}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Domain</span>
              <Badge variant="secondary">{domain}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Difficulty</span>
              <Badge variant="warning">{difficulty}</Badge>
            </div>
          </div>

          <div className="bg-surface rounded-lg p-4 mb-6 text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-1">Before you begin:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Each question will be timed</li>
              <li>Answer as you would in a real interview</li>
              <li>You'll get AI-assisted feedback at the end</li>
            </ul>
          </div>

          <Button onClick={handleStart} className="w-full">
            Start Interview
          </Button>
        </Card>
      </div>
    </div>
  )
}