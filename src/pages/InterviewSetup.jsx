import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'

const DOMAINS = ['Web Development', 'Data Science', 'DSA', 'System Design', 'HR / Behavioral']
const DIFFICULTIES = [
  { level: 'Easy', variant: 'success' },
  { level: 'Medium', variant: 'warning' },
  { level: 'Hard', variant: 'danger' },
]
const MODES = ['Technical', 'HR']

export default function InterviewSetup() {
  const [domain, setDomain] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [mode, setMode] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const canContinue = domain && difficulty && mode

  const handleContinue = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/interviews', { mode, domain, difficulty })
      navigate(`/interview/start/${data.interviewId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start interview')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 animate-fade-in-up">
        <Card>
          <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Set up your mock interview
          </h1>
          <p className="text-sm text-gray-500 mb-6">Choose a domain, mode, and difficulty to begin</p>

          <div className="mb-6 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Interview Mode</h2>
            <div className="flex gap-2 flex-wrap">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-95 ${
                    mode === m
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white border-primary shadow-lg shadow-primary/20'
                      : 'border-gray-200 text-gray-600 bg-white/70 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 space-y-2 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Domain</h2>
            <div className="flex gap-2 flex-wrap">
              {DOMAINS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDomain(d)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-95 ${
                    domain === d
                      ? 'bg-gradient-to-r from-secondary to-emerald-500 text-white border-secondary shadow-lg'
                      : 'border-gray-200 text-gray-600 bg-white/70 hover:border-secondary/50 hover:shadow-lg'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8 space-y-2 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Difficulty</h2>
            <div className="flex gap-2 flex-wrap">
              {DIFFICULTIES.map(({ level, variant }) => (
                <button key={level} onClick={() => setDifficulty(level)}>
                  <Badge variant={difficulty === level ? variant : 'primary'} className={difficulty === level ? 'scale-110' : 'scale-100'}>
                    {level}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <Button disabled={!canContinue} onClick={handleContinue} loading={loading} className="w-full">
            Continue
          </Button>
        </Card>
      </div>
    </div>
  )
}