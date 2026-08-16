import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

  const canContinue = domain && difficulty && mode

  const handleContinue = () => {
    navigate('/interview/start', { state: { domain, difficulty, mode } })
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Set up your mock interview</h1>
          <p className="text-sm text-gray-500 mb-6">Choose a domain, mode, and difficulty to begin</p>

          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Interview Mode</h2>
            <div className="flex gap-2 flex-wrap">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    mode === m
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-300 text-gray-600 hover:border-primary'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Domain</h2>
            <div className="flex gap-2 flex-wrap">
              {DOMAINS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDomain(d)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    domain === d
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-300 text-gray-600 hover:border-primary'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Difficulty</h2>
            <div className="flex gap-2 flex-wrap">
              {DIFFICULTIES.map(({ level, variant }) => (
                <button key={level} onClick={() => setDifficulty(level)}>
                  <Badge variant={difficulty === level ? variant : 'primary'}>
                    {level}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <Button disabled={!canContinue} onClick={handleContinue} className="w-full">
            Continue
          </Button>
        </Card>
      </div>
    </div>
  )
}