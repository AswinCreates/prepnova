import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown, ArrowRight, ArrowUpRight, AudioLines, BarChart3, BrainCircuit,
  BookOpen, Check, ChevronDown, CircleHelp, ClipboardCheck, Clock3, FileDown,
  Menu, MessageSquareText, Mic2, Play, Settings2, ShieldCheck, Sparkles, Target,
  X,
} from 'lucide-react'
import './LandingPage.css'
import ThemeToggle from '../components/ThemeToggle'
import brandMark from '../assets/prepnova_logo.png'

const features = [
  { Icon: Settings2, title: 'Practice made personal', text: 'Choose Technical or HR, a domain and difficulty, then set a session length from 5 to 20 questions. Practice with required questions, written prompts, and MCQs.' },
  { Icon: BookOpen, title: 'Keep your stories ready', text: 'Build a personal Story Vault with real examples from your life. Shape each one with Situation, Task, Action, and Result, then tag skills it demonstrates.' },
  { Icon: AudioLines, title: 'Speak or type your answer', text: 'Use typed responses or record a spoken answer. Review and edit its transcript before submitting. Questions can also be read aloud.' },
  { Icon: BrainCircuit, title: 'Feedback with useful detail', text: 'Review an overall evaluation, per-question feedback, strengths, areas to improve, and suggested next steps after your session.' },
  { Icon: BarChart3, title: 'Progress you can revisit', text: 'Keep interview history, follow your scores over time, compare leaderboard standings, and return to weaker questions for another round.' },
  { Icon: FileDown, title: 'Reports ready to keep', text: 'Open the report for a particular interview and download it as a PDF or DOCX for later review.' },
]

const steps = [
  { number: '01', title: 'Set your focus', text: 'Choose a Technical or HR interview, a domain, difficulty, and the number of questions. Add an optional target role.' },
  { number: '02', title: 'Work through the interview', text: 'Answer one timed question at a time. Type your response or use voice input and check the transcript before you submit.' },
  { number: '03', title: 'Turn feedback into a next step', text: 'Review your score and detailed feedback, save the report, then retry the questions you want to strengthen.' },
]

const faqs = [
  ['What is PrepNova?', 'PrepNova is a mock interview practice platform where you can configure a session, answer questions, review feedback, and track previous attempts.'],
  ['Can I choose how to answer?', 'Yes. You can type your answer or use voice practice. Voice transcripts can be reviewed and edited before they are submitted. A microphone is only needed for voice practice.'],
  ['How are interview answers evaluated?', 'Written answers use the configured AI evaluation service when it is available, with a deterministic fallback if the service cannot be reached. MCQ answers are graded deterministically.'],
  ['What can I find in a report?', 'A report includes the overall evaluation, a summary, strengths, areas to improve, and question-level feedback. You can revisit a report from interview history and download it as PDF or DOCX.'],
  ['What is the Answer Story Vault?', 'It is a personal collection of experiences you can organize with the STAR framework, tag with relevant skills, and revisit when preparing for behavioral questions.'],
  ['What happens if I switch tabs during an interview?', 'PrepNova records tab-switch strikes during a session. At three strikes, the interview is suspended and shown as suspended in interview history.'],
  ['Can I ask for help?', 'Yes. Signed-in users can raise a support ticket and continue the conversation there. An administrator can reply and close the ticket.'],
]

function Brand({ light = false, onClick }) {
  return (
    <Link className={`pn-brand${light ? ' pn-brand-light' : ''}`} to="/" onClick={onClick} aria-label="PrepNova home">
      <span className="pn-brand-mark"><img src={brandMark} alt="" /></span><span>PrepNova</span>
    </Link>
  )
}

function DashboardPreview() {
  return (
    <div className="preview-shell" aria-label="Illustration of a PrepNova interview session">
      <div className="preview-topbar">
        <div className="preview-brand"><span className="preview-dot" /> PrepNova <span className="preview-divider" /> Practice room</div>
        <span className="preview-live"><span /> SESSION LIVE</span>
      </div>
      <div className="preview-content">
        <div className="preview-kicker"><span className="preview-kicker-icon"><MessageSquareText size={15} /></span> BEHAVIORAL INTERVIEW <span className="preview-level">MEDIUM</span></div>
        <h3>Tell me about a time you had to solve a difficult problem with limited information.</h3>
        <p className="preview-hint">Take a moment to think through your answer. Structure helps your story land.</p>
        <div className="preview-answer"><span className="preview-wave"><i /><i /><i /><i /><i /><i /><i /></span><span>Voice answer · transcript review available</span><span className="preview-timer">01:24</span></div>
        <div className="preview-footer"><span><ShieldCheck size={15} /> Your practice is private</span><span>QUESTION 3 OF 8</span></div>
      </div>
      <div className="preview-note"><span className="preview-note-icon"><ClipboardCheck size={17} /></span><span><strong>Feedback after your session</strong><small>Review strengths and next steps.</small></span><ArrowUpRight size={17} /></div>
    </div>
  )
}

function ReportPreview() {
  const [score, setScore] = useState(0)

  useEffect(() => {
    const targetScore = Math.floor(Math.random() * 19) + 72
    const duration = 1400
    let startTime
    let frameId

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frameId = window.requestAnimationFrame(() => setScore(targetScore))
      return () => window.cancelAnimationFrame(frameId)
    }

    const animateScore = (timestamp) => {
      if (startTime === undefined) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easedProgress = 1 - ((1 - progress) ** 3)
      setScore(Math.round(targetScore * easedProgress))
      if (progress < 1) frameId = window.requestAnimationFrame(animateScore)
    }

    frameId = window.requestAnimationFrame(animateScore)
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  return (
    <div className="report-preview" aria-label="Illustration of an interview feedback report">
      <div className="report-preview-head"><span className="report-icon"><ClipboardCheck size={18} /></span><span><strong>Your interview report</strong><small>Feedback for your next practice</small></span><span className="report-status"><Sparkles size={12} /> SAMPLE</span></div>
      <div className="report-score-row"><div className="report-score"><span>EXAMPLE OVERALL SCORE</span><strong><span className="score-count" aria-label={`${score} percent example score`}>{score}</span><small>%</small></strong><small>Illustrative score preview</small></div><div className="report-donut"><span><BarChart3 size={22} /></span></div></div>
      <div className="report-divider" />
      <div className="report-insight"><span className="report-insight-mark"><Check size={14} /></span><span><strong>Strengths</strong><small>Specific feedback based on your answers</small></span><ArrowUpRight size={15} /></div>
      <div className="report-insight"><span className="report-insight-mark report-insight-mark-muted"><Target size={14} /></span><span><strong>Next steps</strong><small>Practical suggestions for another attempt</small></span><ArrowUpRight size={15} /></div>
      <div className="report-download"><FileDown size={15} /> PDF <span /> DOCX <ArrowRight size={14} /></div>
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [activeSection, setActiveSection] = useState('')
  const returningToTop = useRef(false)

  useEffect(() => {
    const sectionIds = ['features', 'how-it-works', 'faq']
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean)
    if (!sections.length) return undefined

    const updateActiveSection = () => {
      if (returningToTop.current) {
        if (window.scrollY <= 1) returningToTop.current = false
        else { setActiveSection(''); return }
      }
      const marker = window.innerHeight * 0.36
      const current = sections.find((section) => {
        const bounds = section.getBoundingClientRect()
        return bounds.top <= marker && bounds.bottom > marker
      })
      setActiveSection(current?.id || '')
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)
    return () => {
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [])

  const closeMenu = () => { returningToTop.current = false; setMenuOpen(false) }
  const handleBrandClick = (event) => {
    setMenuOpen(false)
    setActiveSection('')
    if (window.location.pathname === '/') {
      event.preventDefault()
      returningToTop.current = window.scrollY > 1
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Brand onClick={handleBrandClick} />
          <button className="mobile-menu-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
          <nav className={menuOpen ? 'landing-links landing-links-open' : 'landing-links'} aria-label="Main navigation">
            <a className="landing-section-link" href="#features" aria-current={activeSection === 'features' ? 'location' : undefined} onClick={closeMenu}>Features</a>
            <a className="landing-section-link" href="#how-it-works" aria-current={activeSection === 'how-it-works' ? 'location' : undefined} onClick={closeMenu}>How it works</a>
            <a className="landing-section-link" href="#faq" aria-current={activeSection === 'faq' ? 'location' : undefined} onClick={closeMenu}>FAQ</a>
            <div className="landing-auth"><ThemeToggle className="landing-theme-toggle" /><Link className="nav-login" to="/login">Log in</Link><Link className="nav-cta" to="/signup">Get started <ArrowRight size={16} /></Link></div>
          </nav>
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-mark"><Sparkles size={13} /></span> YOUR NEXT CHAPTER STARTS HERE</div>
            <h1>Show up ready.<br /><span>Leave your mark.</span></h1>
            <p className="hero-description">Build confidence through focused interview practice. Choose how you prepare, get feedback grounded in your answers, and know what to work on next.</p>
            <div className="hero-actions"><Link className="hero-cta" to="/signup">Start practicing <ArrowRight size={18} /></Link><a className="hero-secondary" href="#how-it-works"><span><Play size={14} fill="currentColor" /></span> See how it works</a></div>
            <div className="hero-proof"><span className="hero-proof-icon"><ShieldCheck size={17} /></span><p><strong>A practice space built around you.</strong><br />Your pace, your interview, your next step.</p></div>
          </div>
          <div className="hero-visual"><div className="hero-visual-label"><span className="visual-label-icon"><Mic2 size={15} /></span> YOUR PERSONAL PRACTICE ROOM</div><DashboardPreview /><div className="floating-insight"><span className="insight-icon"><Check size={15} /></span><span><strong>One session at a time</strong><small>Small steps create progress.</small></span></div><div className="visual-caption"><span className="caption-line" /> A little preparation goes a long way <ArrowDown size={14} /></div></div>
        </div>
        <a href="#features" className="hero-scroll" aria-label="Scroll to features"><ArrowDown size={16} /></a>
      </section>

      <section className="trust-strip"><div className="trust-inner"><span>ONE SPACE FOR YOUR PRACTICE LOOP</span><div><span><Target size={16} /> Your target role</span><span><Clock3 size={16} /> Timed sessions</span><span><ShieldCheck size={16} /> Clear next steps</span></div></div></section>

      <section className="features-section" id="features"><div className="section-inner"><div className="section-heading"><span className="section-eyebrow">PREPARATION THAT MOVES WITH YOU</span><h2>Practice with purpose.<br /><span>Grow with every answer.</span></h2><p>From choosing the right questions to understanding your results, PrepNova brings your interview preparation into one focused workspace.</p></div><div className="feature-grid">{features.map(({ Icon, title, text }, index) => <article className="feature-card" key={title}><span className={`feature-icon feature-icon-${index % 3}`}><Icon size={21} /></span><span className="feature-number">0{index + 1}</span><h3>{title}</h3><p>{text}</p><Link to="/signup" aria-label={`Get started: ${title}`}><ArrowUpRight size={17} /></Link></article>)}</div></div></section>

      <section className="how-section" id="how-it-works"><div className="how-inner"><div className="how-intro"><span className="section-eyebrow">A SIMPLE, COMPLETE PRACTICE LOOP</span><h2>Make the next interview feel a little more familiar.</h2><p>Start with what you want to practice. Finish with feedback you can use.</p><Link className="text-link" to="/signup">Take your first step <ArrowRight size={17} /></Link></div><div className="steps-list">{steps.map((step) => <article className="step-item" key={step.number}><span className="step-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><ArrowUpRight className="step-arrow" size={18} /></article>)}</div></div></section>

      <section className="report-section"><div className="report-inner"><div className="report-copy"><span className="section-eyebrow">MORE THAN A SCORE</span><h2>Know what went well.<br /><span>Know what to try next.</span></h2><p>After an interview, open a question-by-question report with your overall score, a clear summary, strengths, improvement areas, and practical suggestions. Your previous reports stay available in interview history.</p><ul><li><Check size={16} /> Feedback tied to your responses</li><li><Check size={16} /> PDF and DOCX downloads</li><li><Check size={16} /> Weak-question retry sessions</li></ul><Link to="/signup" className="report-link">See what you can build on <ArrowRight size={16} /></Link></div><div className="report-art"><ReportPreview /><span className="report-art-note"><Sparkles size={15} /> A useful next step, after every session</span></div></div></section>

      <section className="quote-section"><div className="quote-inner"><span className="quote-mark">“</span><blockquote>The best version of you is already there. Practice helps you bring it into the room.</blockquote><div className="quote-credit"><span className="quote-credit-line" /> A more confident way to prepare</div><span className="quote-decoration"><CircleHelp size={23} /></span></div></section>

      <section className="faq-section" id="faq"><div className="faq-inner"><div className="faq-heading"><span className="section-eyebrow">GOOD QUESTIONS</span><h2>A few things you<br />might be wondering.</h2><p>Need a hand? <Link to="/support">Visit help &amp; support</Link> after signing in.</p></div><div className="faq-list">{faqs.map(([question, answer], index) => <article className={`faq-item${openFaq === index ? ' faq-open' : ''}`} key={question}><button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown size={18} /></button>{openFaq === index && <p>{answer}</p>}</article>)}</div></div></section>

      <section className="final-cta"><div className="final-cta-inner"><span className="final-cta-icon"><Sparkles size={19} /></span><h2>Your next opportunity is worth preparing for.</h2><p>Take the first step today. Your future self will thank you.</p><Link to="/signup" className="final-cta-button">Let’s get you ready <ArrowRight size={17} /></Link><div className="final-cta-note"><Check size={14} /> Create your free account <span /> Start at your own pace</div></div></section>

      <footer className="landing-footer"><div className="footer-inner"><Brand light /><span className="footer-note">A little more ready, every day.</span><div className="footer-links"><Link to="/login">Log in</Link><Link to="/signup">Get started</Link><Link to="/support">Help &amp; support</Link></div><span className="footer-copy">© {new Date().getFullYear()} PrepNova</span></div></footer>
    </main>
  )
}
