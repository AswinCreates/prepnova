import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import { BriefcaseBusiness, FileText, Sparkles } from 'lucide-react'

const DOMAINS = ['Web Development', 'Data Science', 'DSA', 'System Design', 'HR / Behavioral']
const DIFFICULTIES = [
  { level: 'Easy', dot: 'bg-success' },
  { level: 'Medium', dot: 'bg-warning' },
  { level: 'Hard', dot: 'bg-danger' },
]
const MODES = ['Technical', 'HR']

export default function InterviewSetup() {
  const [domain, setDomain] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [mode, setMode] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [jobDescription, setJobDescription] = useState('')
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

  const canContinue = domain && difficulty && mode

  const handleContinue = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/interviews', {
        mode,
        domain,
        difficulty,
        targetRole: targetRole.trim(),
        jobDescription: jobDescription.trim(),
        questionCount,
      })
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
        icon="🧩"
        title="Set up your mock interview"
        subtitle="Choose a mode, domain, difficulty, and how many questions to answer"
      />

      <Card className="animate-fade-in-up">
        <div className="mb-7 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles size={19} /></span>
            <div>
              <h2 className="font-semibold text-ink">Make it about your next role</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">Add a target role or job description to focus your questions. AI feedback can use the same context to make its notes more relevant. Both are optional.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-ink">
              <span className="flex items-center gap-1.5"><BriefcaseBusiness size={14} className="text-primary" /> Target role</span>
              <input
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                maxLength={160}
                placeholder="e.g. Senior frontend engineer"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-ink sm:col-span-2">
              <span className="flex items-center gap-1.5"><FileText size={14} className="text-primary" /> Job description <span className="font-normal text-muted">(optional)</span></span>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                maxLength={8000}
                rows={3}
                placeholder="Paste the responsibilities and skills you want to practice for..."
                className="w-full resize-y rounded-xl border border-line bg-panel px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-muted/70 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
              <span className="self-end text-[10px] font-normal text-muted">{jobDescription.length}/8,000</span>
            </label>
          </div>
        </div>

        <div className="mb-7">
          <h2 className="mb-2 text-sm font-semibold text-ink">Interview Mode</h2>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
                  mode === m
                    ? 'border-primary bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/25'
                    : 'border-line bg-panel2 text-muted hover:border-primary/50 hover:text-ink'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-7">
          <h2 className="mb-2 text-sm font-semibold text-ink">Domain</h2>
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map((d) => (
              <button
                key={d}
                onClick={() => setDomain(d)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                  domain === d
                    ? 'border-secondary bg-gradient-to-r from-secondary to-emerald-500 text-white shadow-lg shadow-secondary/25'
                    : 'border-line bg-panel2 text-muted hover:border-secondary/50 hover:text-ink'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-ink">Difficulty</h2>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map(({ level, dot }) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                aria-pressed={difficulty === level}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                  difficulty === level
                    ? 'border-primary bg-primary/10 text-primary dark:text-indigo-300'
                    : 'border-line bg-panel2 text-muted hover:border-primary/50 hover:text-ink'
                }`}
              >
                <span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${dot}`} />
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label htmlFor="question-count" className="mb-2 block text-sm font-semibold text-ink">Number of questions</label>
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
          Continue →
        </Button>
      </Card>
    </div>
  )
}
