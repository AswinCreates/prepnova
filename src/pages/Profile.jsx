import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import { BriefcaseBusiness, ExternalLink, GraduationCap, Link2, MapPin, Sparkles, UserRound } from 'lucide-react'

const EXPERIENCE_LEVELS = ['Student', 'Entry level', 'Mid-level', 'Senior']
const DOMAINS = ['Web Development', 'Data Science', 'DSA', 'System Design', 'HR / Behavioral']

function safeProfileLink(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function profileFromUser(user) {
  return {
    name: user?.name || '',
    headline: user?.headline || '',
    location: user?.location || '',
    targetRole: user?.targetRole || '',
    experienceLevel: user?.experienceLevel || '',
    preferredDomain: user?.preferredDomain || '',
    bio: user?.bio || '',
    linkedinUrl: user?.linkedinUrl || '',
    portfolioUrl: user?.portfolioUrl || '',
  }
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(() => profileFromUser(user))
  const [skills, setSkills] = useState((user?.targetSkills || []).join(', '))
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)

  const skillList = [...new Set(skills.split(',').map((skill) => skill.trim()).filter(Boolean))].slice(0, 20)
  const completionFields = [
    profile.name,
    profile.headline,
    profile.location,
    profile.targetRole,
    profile.experienceLevel,
    profile.preferredDomain,
    profile.bio,
    skillList.length > 0,
    profile.linkedinUrl || profile.portfolioUrl,
  ]
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100)

  const updateField = (event) => {
    const { name, value } = event.target
    setProfile((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.put('/users/profile', {
        ...profile,
        targetSkills: skillList,
      })
      updateUser(data.user)
      setProfile((current) => ({ ...current, ...data.user }))
      setSkills((data.user.targetSkills || []).join(', '))
      setEditing(false)
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setProfile(profileFromUser(user))
    setSkills((user?.targetSkills || []).join(', '))
    setEditing(false)
  }

  const linkedin = safeProfileLink(profile.linkedinUrl)
  const portfolio = safeProfileLink(profile.portfolioUrl)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<UserRound size={20} />}
        title="Your profile"
        subtitle="Tell PrepNova what you’re working toward, so your practice can fit you better."
        actions={editing ? (
          <Button variant="outline" onClick={handleCancelEdit} disabled={loading}>Cancel</Button>
        ) : (
          <Button onClick={() => setEditing(true)}>Edit profile</Button>
        )}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {editing ? <Card className="animate-fade-in-up lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            <section>
              <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
                <UserRound size={17} className="text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-ink">About you</h2>
                  <p className="mt-0.5 text-xs text-muted">Your name and how you introduce yourself.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Full name" name="name" value={profile.name} onChange={updateField} required minLength={2} maxLength={120} />
                <Input label="Email address" value={user?.email || ''} readOnly aria-readonly="true" className="cursor-not-allowed opacity-70" />
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-ink">Professional headline</span>
                  <input name="headline" value={profile.headline} onChange={updateField} maxLength={160} placeholder="e.g. Computer science student building accessible web apps" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
                </label>
                <Input label="Location" name="location" value={profile.location} onChange={updateField} maxLength={120} placeholder="e.g. Bengaluru, India" />
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Experience level</span>
                  <select name="experienceLevel" value={profile.experienceLevel} onChange={updateField} className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20">
                    <option value="">Choose your level</option>
                    {EXPERIENCE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-ink">A little about you</span>
                  <textarea name="bio" value={profile.bio} onChange={updateField} maxLength={1200} rows={4} placeholder="Share what you’re learning, building, or hoping to bring to your next role." className="w-full resize-y rounded-xl border border-line bg-panel px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-muted/70 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
                  <span className="self-end text-[10px] text-muted">{profile.bio.length}/1,200</span>
                </label>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
                <BriefcaseBusiness size={17} className="text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-ink">Interview goals</h2>
                  <p className="mt-0.5 text-xs text-muted">Help PrepNova tailor your practice sessions.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Target role" name="targetRole" value={profile.targetRole} onChange={updateField} maxLength={160} placeholder="e.g. Junior frontend developer" />
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Preferred domain</span>
                  <select name="preferredDomain" value={profile.preferredDomain} onChange={updateField} className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20">
                    <option value="">Choose a domain</option>
                    {DOMAINS.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-ink">Skills to practice</span>
                  <Input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="React, system design, communication" />
                  <span className="text-[11px] text-muted">Separate skills with commas. Add up to 20.</span>
                </label>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
                <Link2 size={17} className="text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-ink">Links</h2>
                  <p className="mt-0.5 text-xs text-muted">Add a portfolio or professional profile.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="LinkedIn URL" type="url" name="linkedinUrl" value={profile.linkedinUrl} onChange={updateField} maxLength={300} placeholder="https://linkedin.com/in/you" />
                <Input label="Portfolio or GitHub URL" type="url" name="portfolioUrl" value={profile.portfolioUrl} onChange={updateField} maxLength={300} placeholder="https://yourportfolio.com" />
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="text-xs text-muted">Your details stay with your account.</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={loading}>Cancel</Button>
                <Button type="submit" loading={loading}><Sparkles size={16} /> Save profile</Button>
              </div>
            </div>
          </form>
        </Card> : <Card className="animate-fade-in-up space-y-7 lg:col-span-2">
          <section className="flex items-center gap-4 border-b border-line pb-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white">{profile.name.trim().charAt(0).toUpperCase() || 'U'}</div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-ink">{profile.name || 'Your name'}</h2>
              <p className="mt-1 text-sm text-muted">{profile.headline || 'Add a professional headline to introduce yourself.'}</p>
              <p className="mt-1 truncate text-xs text-muted">{user?.email || ''}</p>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Career details</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ['Target role', profile.targetRole],
                ['Experience level', profile.experienceLevel],
                ['Preferred domain', profile.preferredDomain],
                ['Location', profile.location],
              ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className={`mt-1 text-sm font-medium ${value ? 'text-ink' : 'text-muted'}`}>{value || 'Not added yet'}</dd></div>)}
            </dl>
          </section>

          <section className="border-t border-line pt-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">About</h3>
            <p className={`whitespace-pre-wrap text-sm leading-relaxed ${profile.bio ? 'text-ink' : 'text-muted'}`}>{profile.bio || 'Add a short introduction about what you’re learning, building, or aiming for.'}</p>
          </section>

          <section className="border-t border-line pt-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Skills to practice</h3>
            {skillList.length ? <div className="flex flex-wrap gap-2">{skillList.map((skill) => <span key={skill} className="rounded-full border border-line bg-panel2 px-3 py-1.5 text-xs font-medium text-ink">{skill}</span>)}</div> : <p className="text-sm text-muted">Add skills you’d like to focus on in your interview practice.</p>}
          </section>

          {(linkedin || portfolio) && <section className="border-t border-line pt-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Links</h3>
            <div className="flex flex-wrap gap-x-5 gap-y-2">{linkedin && <a className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline" href={linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={14} /></a>}{portfolio && <a className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline" href={portfolio} target="_blank" rel="noreferrer">Portfolio / GitHub <ExternalLink size={14} /></a>}</div>
          </section>}
        </Card>}

        <div className="space-y-5">
          <Card className="animate-fade-in-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Profile preview</h2>
              <span className="text-xs font-semibold text-primary">{completion}%</span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-panel2" role="progressbar" aria-label="Profile completion" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${completion}%` }} />
            </div>
            <div className="rounded-2xl border border-line bg-panel2 p-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white">{profile.name.trim().charAt(0).toUpperCase() || 'U'}</div>
              <h3 className="font-semibold text-ink">{profile.name || 'Your name'}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{profile.headline || profile.targetRole || 'Your headline will appear here.'}</p>
              {profile.bio && <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-muted">{profile.bio}</p>}
              {(profile.location || profile.experienceLevel) && <div className="mt-3 flex flex-wrap gap-2">{profile.location && <span className="inline-flex items-center gap-1 text-[11px] text-muted"><MapPin size={12} />{profile.location}</span>}{profile.experienceLevel && <span className="inline-flex items-center gap-1 text-[11px] text-muted"><GraduationCap size={13} />{profile.experienceLevel}</span>}</div>}
              {skillList.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{skillList.slice(0, 5).map((skill) => <span key={skill} className="rounded-full border border-line bg-panel px-2.5 py-1 text-[10px] font-medium text-muted">{skill}</span>)}</div>}
              {(linkedin || portfolio) && <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-3">{linkedin && <a className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline" href={linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={12} /></a>}{portfolio && <a className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline" href={portfolio} target="_blank" rel="noreferrer">Portfolio <ExternalLink size={12} /></a>}</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
