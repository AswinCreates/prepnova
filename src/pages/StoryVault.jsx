import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRight, BookOpen, Check, CircleHelp, Lightbulb, Pencil, Plus, Save, Search, Sparkles, Star, Trash2, X } from 'lucide-react'
import api from '../services/api'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import Loader from '../components/Loader'
import PageHeader from '../components/PageHeader'

const STORY_TYPES = ['Achievement', 'Problem solving', 'Teamwork', 'Leadership', 'Conflict resolution', 'Failure & learning', 'Adaptability', 'Initiative', 'Other']
const STAR_FIELDS = [
  { key: 'situation', letter: 'S', title: 'Situation', prompt: 'What was happening? Add enough context to understand the moment.' },
  { key: 'task', letter: 'T', title: 'Task', prompt: 'What were you responsible for, or what needed to be done?' },
  { key: 'action', letter: 'A', title: 'Action', prompt: 'What steps did you personally take? Be specific.' },
  { key: 'result', letter: 'R', title: 'Result', prompt: 'What changed? Include the outcome or what you learned.' },
]
const QUESTION_PROMPTS = {
  Achievement: 'Tell me about an achievement you are proud of.',
  'Problem solving': 'Tell me about a difficult problem you solved.',
  Teamwork: 'Describe a time you worked with others to reach a goal.',
  Leadership: 'Tell me about a time you took the lead.',
  'Conflict resolution': 'Describe a disagreement and how you handled it.',
  'Failure & learning': 'Tell me about a mistake or setback and what you learned.',
  Adaptability: 'Describe a time you had to adapt to a change.',
  Initiative: 'Tell me about a time you took initiative.',
  Other: 'What experience best shows how you approach your work?',
}
const EMPTY_STORY = { title: '', storyType: 'Achievement', situation: '', task: '', action: '', result: '', skills: [] }

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently updated'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function TextAreaField({ id, label, hint, value, onChange }) {
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink"><span className="grid h-6 w-6 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{label[0]}</span>{label}</span>
      <textarea id={id} value={value} onChange={onChange} maxLength={5000} rows={4} placeholder={hint} className="w-full resize-y rounded-xl border border-line bg-panel px-3.5 py-3 text-sm leading-relaxed text-ink placeholder:text-muted/70 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
    </label>
  )
}

export default function StoryVault() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [story, setStory] = useState(EMPTY_STORY)
  const [skillsText, setSkillsText] = useState('')
  const [titleError, setTitleError] = useState('')
  const [search, setSearch] = useState('')

  const loadStories = useCallback(async () => {
    const { data } = await api.get('/users/stories')
    setStories(data.stories || [])
  }, [])

  useEffect(() => {
    let active = true
    Promise.resolve().then(loadStories).catch((error) => {
      if (active) toast.error(error.response?.data?.message || 'Could not load your story vault')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [loadStories])

  const skillCount = useMemo(() => new Set(stories.flatMap((item) => item.skills || []).map((skill) => skill.toLowerCase())).size, [stories])
  const completeCount = useMemo(() => stories.filter((item) => STAR_FIELDS.every(({ key }) => item[key]?.trim())).length, [stories])
  const filteredStories = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return stories
    return stories.filter((item) => [item.title, item.story_type, ...(item.skills || [])].join(' ').toLowerCase().includes(query))
  }, [search, stories])

  const startNewStory = () => {
    setEditingId(null)
    setStory(EMPTY_STORY)
    setSkillsText('')
    setTitleError('')
    setEditorOpen(true)
  }

  const startEditing = (item) => {
    setEditingId(item.id)
    setStory({ title: item.title, storyType: item.story_type, situation: item.situation || '', task: item.task || '', action: item.action || '', result: item.result || '', skills: item.skills || [] })
    setSkillsText((item.skills || []).join(', '))
    setTitleError('')
    setEditorOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingId(null)
    setTitleError('')
  }

  const updateField = (event) => {
    const { name, value } = event.target
    setStory((current) => ({ ...current, [name]: value }))
    if (name === 'title') setTitleError('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (story.title.trim().length < 2) {
      setTitleError('Add a title with at least 2 characters.')
      return
    }

    const payload = {
      ...story,
      title: story.title.trim(),
      skills: [...new Set(skillsText.split(',').map((value) => value.trim()).filter(Boolean))].slice(0, 12),
    }
    setSaving(true)
    try {
      const { data } = editingId
        ? await api.put(`/users/stories/${editingId}`, payload)
        : await api.post('/users/stories', payload)
      setStories((current) => editingId
        ? current.map((item) => item.id === editingId ? data.story : item)
        : [data.story, ...current])
      closeEditor()
      toast.success(editingId ? 'Story updated' : 'Story added to your vault')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save this story')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete “${item.title}” from your Story Vault?`)) return
    setDeletingId(item.id)
    try {
      await api.delete(`/users/stories/${item.id}`)
      setStories((current) => current.filter((storyItem) => storyItem.id !== item.id))
      toast.success('Story deleted')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete this story')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader size="lg" /></div>

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader icon={<BookOpen size={20} />} title="Answer Story Vault" subtitle="Save the experiences you can draw on in an interview. Shape each one with STAR, then find it when you need it." actions={<Button onClick={startNewStory}><Plus size={16} /> Add a story</Button>} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen size={17} /></span><div><p className="text-[10px] text-muted">Saved stories</p><p className="text-xl font-bold tabular-nums text-ink">{stories.length}</p></div></Card>
        <Card className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary/10 text-secondary"><Sparkles size={17} /></span><div><p className="text-[10px] text-muted">Skills tagged</p><p className="text-xl font-bold tabular-nums text-ink">{skillCount}</p></div></Card>
        <Card className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-success/10 text-success"><Check size={17} /></span><div><p className="text-[10px] text-muted">STAR complete</p><p className="text-xl font-bold tabular-nums text-ink">{completeCount}</p></div></Card>
      </div>

      {editorOpen && <Card className="animate-fade-in-up border-primary/25">
        <form onSubmit={handleSave} noValidate className="space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-line pb-4"><div><h2 className="font-semibold text-ink">{editingId ? 'Edit your story' : 'Capture a story'}</h2><p className="mt-1 text-xs text-muted">Start with the details you remember. You can fill in or refine the rest later.</p></div><button type="button" onClick={closeEditor} className="rounded-lg p-2 text-muted transition hover:bg-panel2 hover:text-ink" aria-label="Close story editor"><X size={18} /></button></div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-ink">Story title</span><input name="title" value={story.title} onChange={updateField} maxLength={120} placeholder="e.g. Turned a group project around" className={`w-full rounded-xl border bg-panel px-3 py-2.5 text-sm text-ink outline-none transition focus:ring-2 focus:ring-primary/20 ${titleError ? 'border-danger focus:border-danger' : 'border-line focus:border-primary/60'}`} aria-invalid={Boolean(titleError)} aria-describedby={titleError ? 'story-title-error' : undefined} />{titleError && <span id="story-title-error" role="alert" className="mt-1 block text-xs font-medium text-danger">{titleError}</span>}</label>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-ink">Story type</span><select name="storyType" value={story.storyType} onChange={updateField} className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20">{STORY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">{STAR_FIELDS.map(({ key, title, prompt }) => <TextAreaField key={key} id={`story-${key}`} label={title} hint={prompt} value={story[key]} onChange={(event) => setStory((current) => ({ ...current, [key]: event.target.value }))} />)}</div>

          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-ink">Skills or themes <span className="font-normal text-muted">(comma separated, up to 12)</span></span><input value={skillsText} onChange={(event) => setSkillsText(event.target.value)} maxLength={600} placeholder="e.g. teamwork, communication, problem solving" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/20" /></label>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3.5"><div className="flex items-start gap-2.5"><Lightbulb size={17} className="mt-0.5 shrink-0 text-primary" /><p className="text-xs leading-relaxed text-muted"><strong className="text-ink">A helpful reminder:</strong> focus on what you did, what changed because of it, and what you learned. Your stories are private to your account.</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={closeEditor}>Cancel</Button><Button type="submit" loading={saving}><Save size={15} /> Save story</Button></div></div>
        </form>
      </Card>}

      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-ink">Your stories</h2><p className="mt-1 text-xs text-muted">Build a collection of real examples you can adapt to different questions.</p></div>{stories.length > 0 && <label className="relative block w-full sm:w-64"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stories or skills" aria-label="Search stories or skills" className="w-full rounded-xl border border-line bg-panel py-2.5 pl-9 pr-3 text-xs text-ink outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20" /></label>}</div>

      {filteredStories.length ? <div className="space-y-4">{filteredStories.map((item) => <Card key={item.id} className="animate-fade-in-up overflow-hidden" padded={false}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="primary">{item.story_type}</Badge><span className="text-[10px] text-muted">Updated {formatDate(item.updated_at)}</span></div><h3 className="text-base font-semibold text-ink">{item.title}</h3><p className="mt-1 flex items-start gap-1.5 text-xs text-muted"><CircleHelp size={14} className="mt-0.5 shrink-0 text-primary" /><span><strong className="font-medium text-ink">Could help with:</strong> “{QUESTION_PROMPTS[item.story_type] || QUESTION_PROMPTS.Other}”</span></p></div><div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" onClick={() => startEditing(item)}><Pencil size={14} /> Edit</Button><Button variant="danger" size="sm" loading={deletingId === item.id} onClick={() => handleDelete(item)} aria-label={`Delete ${item.title}`}><Trash2 size={14} /></Button></div></div>
        <div className="grid gap-0 sm:grid-cols-2">{STAR_FIELDS.map(({ key, letter, title }) => <div key={key} className="flex min-h-28 gap-3 border-b border-line p-4 last:border-b-0 sm:odd:border-r sm:nth-last-2:border-b-0"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-panel2 text-xs font-bold text-primary">{letter}</span><div className="min-w-0"><p className="text-xs font-semibold text-ink">{title}</p><p className={`mt-1 whitespace-pre-wrap text-xs leading-relaxed ${item[key] ? 'text-muted' : 'italic text-muted/70'}`}>{item[key] || 'Not added yet'}</p></div></div>)}</div>
        {!!item.skills?.length && <div className="flex flex-wrap gap-1.5 border-t border-line px-5 py-3">{item.skills.map((skill) => <span key={skill} className="rounded-full border border-line bg-panel2 px-2.5 py-1 text-[10px] font-medium text-muted">{skill}</span>)}</div>}
      </Card>)}</div> : <Card className="py-12 text-center"><span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Star size={21} /></span><h3 className="font-semibold text-ink">{search ? 'No stories match that search' : 'Your story vault is ready'}</h3><p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">{search ? 'Try another title, story type, or skill.' : 'Save a real moment you are proud of, a challenge you worked through, or something you learned. We’ll help you shape it into a clear interview story.'}</p>{!search && <Button className="mt-5" onClick={startNewStory}><Plus size={16} /> Add your first story <ArrowRight size={15} /></Button>}</Card>}
    </div>
  )
}
