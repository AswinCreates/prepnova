import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, Clock3, Crown, Medal, Sparkles, Trophy, Users } from 'lucide-react'
import api from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Loader from '../components/Loader'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'

function formatDuration(totalSeconds) {
  const seconds = Number(totalSeconds) || 0
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
}

const podiumStyles = [
  { Icon: Crown, surface: 'border-amber-400/40 bg-amber-400/10', medal: 'bg-amber-400 text-amber-950', label: '1st place' },
  { Icon: Medal, surface: 'border-slate-400/40 bg-slate-400/10', medal: 'bg-slate-300 text-slate-800', label: '2nd place' },
  { Icon: Medal, surface: 'border-orange-500/30 bg-orange-500/10', medal: 'bg-orange-400 text-orange-950', label: '3rd place' },
]

function PodiumCard({ entry, place, isCurrentUser, onOpen }) {
  const style = podiumStyles[place]
  const Icon = style.Icon
  return (
    <button
      type="button"
      disabled={!isCurrentUser}
      onClick={() => onOpen(entry.interview_id)}
      className={`group flex w-full flex-col rounded-2xl border p-5 text-left transition duration-200 ${isCurrentUser ? 'hover:-translate-y-1 hover:shadow-lg' : 'cursor-default'} ${style.surface} ${isCurrentUser ? 'ring-2 ring-primary/50' : ''}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${style.medal}`}><Icon size={19} /></span>
        <span className="text-xs font-bold uppercase tracking-wide text-muted">{style.label}</span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-panel text-sm font-bold text-primary ring-1 ring-line">{initials(entry.name)}</span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{entry.name}{isCurrentUser ? ' (you)' : ''}</p>
          <p className="truncate text-xs text-muted">{entry.headline || entry.domain}</p>
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between border-t border-line/70 pt-4">
        <div><p className="text-2xl font-bold tabular-nums text-ink">{entry.score}%</p><p className="text-[11px] text-muted">Best score</p></div>
        <div className="text-right"><p className="flex items-center justify-end gap-1.5 text-sm font-semibold tabular-nums text-ink"><Clock3 size={14} className="text-muted" />{formatDuration(entry.elapsed_seconds)}</p><p className="text-[11px] text-muted">completion time</p></div>
      </div>
    </button>
  )
}

export default function Leaderboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    api.get('/dashboard/leaderboard')
      .then(({ data: result }) => { if (active) setData(result) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader size="lg" /></div>

  if (error) {
    return <Card className="mx-auto max-w-lg p-8 text-center"><Award className="mx-auto mb-3 text-primary" size={30} /><h2 className="text-lg font-semibold text-ink">Leaderboard unavailable</h2><p className="mt-2 text-sm text-muted">We couldn’t load rankings right now. Please try again.</p><Button className="mt-5" onClick={() => window.location.reload()}>Retry</Button></Card>
  }

  const entries = data?.leaderboard || []
  const topThree = [entries[0], entries[1], entries[2]]
  const currentRank = data?.currentUserRank
  const currentEntry = data?.currentUserEntry
  const openReport = (interviewId) => navigate(`/interview/results/${interviewId}`)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<Trophy size={20} />}
        title="Leaderboard"
        subtitle="Your best interview score earns your place. Faster completion breaks ties."
        actions={<Badge variant="secondary"><Users size={14} /> {data?.participantCount || 0} candidates</Badge>}
      />

      {currentEntry ? (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-primary/25 bg-primary/5 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Award size={21} /></span>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Your current standing</p><p className="mt-0.5 font-semibold text-ink">Rank #{currentRank} <span className="font-normal text-muted">of {data.participantCount}</span></p></div>
          </div>
          <div className="flex items-center gap-5 sm:gap-8">
            <div><p className="text-lg font-bold tabular-nums text-ink">{currentEntry.score}%</p><p className="text-[11px] text-muted">Best score</p></div>
            <div><p className="text-lg font-bold tabular-nums text-ink">{formatDuration(currentEntry.elapsed_seconds)}</p><p className="text-[11px] text-muted">Time</p></div>
            <Button variant="secondary" onClick={() => openReport(currentEntry.interview_id)}>View report</Button>
          </div>
        </Card>
      ) : (
        <Card className="mb-6 flex flex-col items-start gap-4 border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles size={21} /></span><div><p className="font-semibold text-ink">Your spot is waiting</p><p className="text-sm text-muted">Complete an interview to appear on the leaderboard.</p></div></div>
          <Button onClick={() => navigate('/interview/setup')}>Start an interview</Button>
        </Card>
      )}

      {entries.length === 0 ? (
        <Card className="px-6 py-14 text-center"><Trophy className="mx-auto mb-3 text-muted/60" size={34} /><h2 className="text-lg font-semibold text-ink">No rankings yet</h2><p className="mt-1 text-sm text-muted">Be the first to complete an interview and claim the top spot.</p></Card>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-ink">Top performers</h2><p className="text-xs text-muted">Ranked by score, then time</p></div>
          <div className="mb-8 grid gap-3 md:grid-cols-3">
            {topThree.map((entry, place) => entry ? <PodiumCard key={entry.user_id} entry={entry} place={place} isCurrentUser={entry.user_id === user?.id} onOpen={openReport} /> : <div key={`empty-${place}`} className="hidden rounded-2xl border border-dashed border-line bg-panel/50 md:block" />)}
          </div>

          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-5"><div><h2 className="font-semibold text-ink">Full rankings</h2><p className="mt-0.5 text-xs text-muted">Each candidate appears once, using their strongest result.</p></div><Trophy className="text-primary" size={19} /></div>
            <div className="divide-y divide-line">
              {entries.map((entry) => {
                const isCurrentUser = entry.user_id === user?.id
                return (
                  <button key={entry.user_id} type="button" disabled={!isCurrentUser} onClick={() => openReport(entry.interview_id)} className={`grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors sm:grid-cols-[50px_minmax(0,1.5fr)_minmax(130px,1fr)_100px_100px] sm:px-5 ${isCurrentUser ? 'bg-primary/5 hover:bg-panel2/70' : 'cursor-default'}`}>
                    <span className={`text-center text-sm font-bold tabular-nums ${entry.rank <= 3 ? 'text-primary' : 'text-muted'}`}>#{entry.rank}</span>
                    <span className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-panel2 text-xs font-bold text-primary">{initials(entry.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{entry.name}{isCurrentUser ? <span className="ml-1 text-primary">(you)</span> : null}</span><span className="block truncate text-xs text-muted">{entry.headline || entry.domain}</span></span></span>
                    <span className="hidden min-w-0 sm:block"><span className="block truncate text-xs font-medium text-ink">{entry.domain}</span><span className="text-[11px] text-muted">{entry.difficulty} · {formatDate(entry.completed_at)}</span></span>
                    <span className="text-right"><span className="block text-sm font-bold tabular-nums text-ink">{entry.score}%</span><span className="text-[11px] text-muted">score</span></span>
                    <span className="hidden text-right sm:block"><span className="block text-sm font-semibold tabular-nums text-ink">{formatDuration(entry.elapsed_seconds)}</span><span className="text-[11px] text-muted">time</span></span>
                  </button>
                )
              })}
            </div>
            {data?.participantCount > entries.length && <p className="border-t border-line px-5 py-3 text-center text-xs text-muted">Showing the top 50 candidates. Your rank is included above even if it falls outside this list.</p>}
          </Card>
        </>
      )}
      <p className="mt-4 text-center text-xs text-muted">Rank uses your best score percentage. If scores match, the shorter interview time ranks higher.</p>
    </div>
  )
}
