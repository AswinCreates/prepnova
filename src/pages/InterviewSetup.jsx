import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import { INTERVIEW_DOMAINS } from '../constants/interviewDomains'
import { Code2, ListChecks, UsersRound } from 'lucide-react'

const DIFFICULTIES = [
  { level: 'Easy', dot: 'bg-success' },
  { level: 'Medium', dot: 'bg-warning' },
  { level: 'Hard', dot: 'bg-danger' },
]
const MODES = [
  { value: 'Technical', label: 'Technical', description: 'Practice role-specific technical skills.', Icon: Code2 },
  { value: 'HR', label: 'HR', description: 'Practice behavioral and workplace scenarios.', Icon: UsersRound },
]

export default function InterviewSetup() {
  const [domain, setDomain] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [mode, setMode] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [compulsoryCount, setCompulsoryCount] = useState(3)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/questions/pool')
      .then(({ data }) => {
        const count = Number(data.compulsoryCount || 0)
        setCompulsoryCount(count)
        setQuestionCount((current) => Math.max(current, count, 5))
      })
      .catch(() => toast.error('Could not load the required interview questions'))
  }, [])

  const canContinue = Boolean(mode && domain && difficulty)

  const handleContinue = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/interviews', { mode, domain, difficulty, questionCount })
      navigate(`/interview/start/${data.interviewId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start interview')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<ListChecks size={20} />}
        title="Set up your mock interview"
        subtitle="Choose your interview mode first, then select a matching domain and difficulty."
      />

      <Card className="animate-fade-in-up">
        <section className="mb-7">
          <h2 className="mb-1 text-sm font-semibold text-ink">1. Choose interview mode</h2>
          <p className="mb-3 text-xs text-muted">Start with the kind of interview you want to practice.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {MODES.map(({ value, label, description, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setMode(value); setDomain('') }}
                aria-pressed={mode === value}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.99] ${mode === value ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'border-line bg-panel hover:border-primary/40 hover:bg-panel2'}`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${mode === value ? 'bg-primary text-white' : 'bg-panel2 text-muted'}`}><Icon size={19} /></span>
                <span><span className="block text-sm font-semibold text-ink">{label}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{description}</span></span>
              </button>
            ))}
          </div>
        </section>

        <div className="mb-7">
          <label htmlFor="interview-domain" className="mb-2 block text-sm font-semibold text-ink">2. Select a {mode === 'HR' ? 'HR' : 'technical'} domain</label>
          <select
            id="interview-domain"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            disabled={!mode}
            className="w-full rounded-xl border border-line bg-panel px-3 py-3 text-sm text-ink outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-lg"
          >
            <option value="">{mode ? 'Choose a domain' : 'Choose a mode first'}</option>
            {mode && INTERVIEW_DOMAINS[mode].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <p className="mt-2 text-xs text-muted">Questions will focus on the selected domain.</p>
        </div>

        <div className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-ink">3. Difficulty</h2>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map(({ level, dot }) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                aria-pressed={difficulty === level}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 ${difficulty === level ? 'border-primary bg-primary/10 text-primary dark:text-primary' : 'border-line bg-panel2 text-muted hover:border-primary/50 hover:text-ink'}`}
              >
                <span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${dot}`} />{level}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label htmlFor="question-count" className="mb-2 block text-sm font-semibold text-ink">4. Number of questions</label>
          <select
            id="question-count"
            value={questionCount}
            onChange={(event) => setQuestionCount(Number(event.target.value))}
            className="w-full rounded-xl border border-line bg-panel px-3 py-3 text-sm text-ink outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
          >
            <option value={5} disabled={compulsoryCount > 5}>5 questions</option>
            <optgroup label="6–10 questions">
              {[6, 7, 8, 9, 10].map((count) => <option key={count} value={count} disabled={count < compulsoryCount}>{count} questions</option>)}
            </optgroup>
            <optgroup label="11–15 questions">
              {[11, 12, 13, 14, 15].map((count) => <option key={count} value={count} disabled={count < compulsoryCount}>{count} questions</option>)}
            </optgroup>
            <optgroup label="16–20 questions">
              {[16, 17, 18, 19, 20].map((count) => <option key={count} value={count} disabled={count < compulsoryCount}>{count} questions</option>)}
            </optgroup>
          </select>
          <p className="mt-2 text-xs text-muted">Includes {compulsoryCount} required questions asked in every interview.</p>
        </div>

        <Button disabled={!canContinue} onClick={handleContinue} loading={loading} className="w-full" size="lg">
          Start interview
        </Button>
      </Card>
    </div>
  )
}
