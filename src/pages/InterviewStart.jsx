import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'

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
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="max-w-lg mx-auto p-6 flex justify-center">
          <Loader size="lg" />
        </div>
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="max-w-lg mx-auto p-6 text-center">
          <p className="text-gray-500 mb-4">No interview found.</p>
          <Button onClick={() => navigate('/interview/setup')}>Go to Setup</Button>
        </div>
      </div>
    )
  }

  const isCompleted = interview.status === 'completed'

  const handleStart = () => {
    navigate(`/interview/session/${id}`)
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-lg mx-auto p-6 animate-fade-in-up">
        <Card>
          <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            You're all set
          </h1>
          <p className="text-sm text-gray-500 mb-6">Review your session details before starting</p>

          <div className="flex flex-col gap-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Mode</span>
              <Badge>{interview.mode}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Domain</span>
              <Badge variant="secondary">{interview.domain}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Difficulty</span>
              <Badge variant="warning">{interview.difficulty}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Questions</span>
              <Badge variant="primary">{interview.questions?.length ?? 0}</Badge>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4 mb-6 text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-1">Before you begin:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Each question is timed</li>
              <li>Answer by typing or speaking (voice supported in Chrome/Edge)</li>
              <li>You'll get AI-assisted feedback at the end</li>
            </ul>
          </div>

          {isCompleted ? (
            <Button onClick={() => navigate(`/interview/results/${id}`)} className="w-full">
              View Results
            </Button>
          ) : (
            <Button onClick={handleStart} className="w-full">
              🚀 Start Interview
            </Button>
          )}
        </Card>
      </div>
    </div>
  )
}