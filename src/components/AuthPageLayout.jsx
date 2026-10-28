import { Link } from 'react-router-dom'
import { ArrowRight, AudioLines, BarChart3, Check, House, Sparkles } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import brandMark from '../assets/prepnova_logo.png'

const highlights = [
  { Icon: AudioLines, title: 'Practice your way', text: 'Type an answer or rehearse it aloud.' },
  { Icon: BarChart3, title: 'Learn from every round', text: 'Get clear feedback and choose what to improve next.' },
]

export default function AuthPageLayout({ children, mode = 'login' }) {
  const isSignup = mode === 'signup'

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <Link className="auth-brand" to="/" aria-label="PrepNova home">
          <span className="auth-brand-mark"><img src={brandMark} alt="" /></span><span>PrepNova</span>
        </Link>
        <div className="auth-topbar-actions">
          <Link className="auth-home-link" to="/"><House size={15} /><span>Home</span></Link>
          <ThemeToggle className="auth-theme-toggle" />
        </div>
      </header>

      <div className="auth-layout">
        <section className="auth-story" aria-label="About PrepNova">
          <div className="auth-eyebrow"><span><Sparkles size={13} /></span> YOUR NEXT CHAPTER STARTS HERE</div>
          <h1>{isSignup ? <>Make room for<br /><span>your next big moment.</span></> : <>A little practice.<br /><span>A lot more ready.</span></>}</h1>
          <p className="auth-story-copy">{isSignup
            ? 'Build interview confidence one thoughtful practice session at a time. Start with your goals, and PrepNova will help you find a useful next step.'
            : 'Pick up where you left off. Revisit your practice, reflect on your feedback, and keep moving toward the interview you want.'}</p>

          <div className="auth-highlights">
            {highlights.map(({ Icon, title, text }) => <div className="auth-highlight" key={title}><span className="auth-highlight-icon"><Icon size={18} /></span><span><strong>{title}</strong><small>{text}</small></span><Check className="auth-highlight-check" size={15} /></div>)}
          </div>

          <div className="auth-quote"><span className="auth-quote-mark">“</span><p>Confidence doesn’t arrive all at once. It grows with every answer you practice.</p><span className="auth-quote-caption">A more personal way to prepare</span><ArrowRight className="auth-quote-arrow" size={17} /></div>
        </section>

        <section className="auth-form-area" aria-label={isSignup ? 'Create a PrepNova account' : 'Log in to PrepNova'}>
          <div className="auth-form-intro"><span className="auth-form-kicker">{isSignup ? 'START YOUR PRACTICE' : 'WELCOME BACK'}</span><h2>{isSignup ? 'Create your account' : 'Log in to PrepNova'}</h2><p>{isSignup ? 'A few details, then you’re ready to begin.' : 'Your next practice session is just around the corner.'}</p></div>
          {children}
          <p className="auth-privacy-note"><Check size={14} /> Your interview practice stays connected to your account.</p>
        </section>
      </div>

      <footer className="auth-footer"><span>© {new Date().getFullYear()} PrepNova</span><span>Practice with purpose. Grow with confidence.</span><Link to="/">Back to home</Link></footer>
    </main>
  )
}
