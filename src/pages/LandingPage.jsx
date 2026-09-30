import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown, ArrowRight, ArrowUpRight, AudioLines, BarChart3, Check, ChevronDown,
  CircleHelp, ClipboardCheck, Clock3, Menu, MessageSquareText, Mic2, Play,
  ShieldCheck, Sparkles, Target, X,
} from 'lucide-react'
import './LandingPage.css'
import ThemeToggle from '../components/ThemeToggle'

const features = [
  { Icon: Target, title: 'Practice that feels real', text: 'Role specific questions help you rehearse the moments that matter, from behavioral rounds to technical screens.' },
  { Icon: AudioLines, title: 'Speak or type your way', text: 'Run a voice interview or work through answers at your own pace. PrepNova fits the way you like to practice.' },
  { Icon: BarChart3, title: 'Know what to improve', text: 'Get clear feedback on structure, relevance, and delivery, then track your progress across every session.' },
]

const steps = [
  { number: '01', title: 'Choose your interview', text: 'Pick a role, domain, and difficulty to make every practice session relevant.' },
  { number: '02', title: 'Show what you know', text: 'Answer thoughtful questions in a focused, realistic interview flow.' },
  { number: '03', title: 'Build on your feedback', text: 'Review your strengths, find your next steps, and come back more confident.' },
]

const faqs = [
  ['What is PrepNova?', 'PrepNova is an interview practice platform that helps you prepare with realistic questions, flexible voice or text sessions, and useful feedback.'],
  ['Who is it for?', 'Anyone preparing for a job interview, from first time applicants to experienced professionals changing roles.'],
  ['Do I need a microphone?', 'No. You can choose a text based interview at any time. Voice practice is optional.'],
]

function Brand({ light = false }) {
  return <Link className={`pn-brand${light ? ' pn-brand-light' : ''}`} to="/" aria-label="PrepNova home"><span className="pn-brand-mark"><Sparkles size={17} strokeWidth={2.4} /></span><span>PrepNova</span></Link>
}

function DashboardPreview() {
  return (
    <div className="preview-shell" aria-label="Preview of the PrepNova practice dashboard">
      <div className="preview-topbar"><div className="preview-brand"><span className="preview-dot" /> PrepNova <span className="preview-divider" /> Practice room</div><span className="preview-live"><span /> SESSION LIVE</span></div>
      <div className="preview-content">
        <div className="preview-kicker"><span className="preview-kicker-icon"><MessageSquareText size={15} /></span> BEHAVIORAL INTERVIEW <span className="preview-level">MID-LEVEL</span></div>
        <h3>Tell me about a time you had to solve a difficult problem with limited information.</h3>
        <p className="preview-hint">Take a moment to think through your answer. Structure helps your story land.</p>
        <div className="preview-answer"><span className="preview-wave"><i /><i /><i /><i /><i /><i /><i /></span><span>Listening to your answer...</span><span className="preview-timer">01:24</span></div>
        <div className="preview-footer"><span><ShieldCheck size={15} /> Your practice is private</span><span>QUESTION 3 OF 8</span></div>
      </div>
      <div className="preview-note"><span className="preview-note-icon"><ClipboardCheck size={17} /></span><span><strong>Thoughtful feedback, after every session</strong><small>Clear takeaways to help you grow.</small></span><ArrowUpRight size={17} /></div>
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  return (
    <main className="landing-page">
      <header className="landing-nav"><div className="landing-nav-inner"><Brand /><button className="mobile-menu-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button><nav className={menuOpen ? 'landing-links landing-links-open' : 'landing-links'}><a href="#features" onClick={() => setMenuOpen(false)}>Why PrepNova</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a><div className="landing-auth"><ThemeToggle className="landing-theme-toggle" /><Link className="nav-login" to="/login">Log in</Link><Link className="nav-cta" to="/signup">Get started <ArrowRight size={16} /></Link></div></nav></div></header>

      <section className="landing-hero"><div className="hero-inner"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-mark"><Sparkles size={13} /></span> YOUR NEXT CHAPTER STARTS HERE</div><h1>Show up ready.<br /><span>Leave your mark.</span></h1><p className="hero-description">The interview is your moment. Practice out loud, find your strongest stories, and walk in knowing you’re ready.</p><div className="hero-actions"><Link className="hero-cta" to="/signup">Start practicing <ArrowRight size={18} /></Link><a className="hero-secondary" href="#how-it-works"><span><Play size={14} fill="currentColor" /></span> See how it works</a></div><div className="hero-proof"><div className="proof-avatars"><span>A</span><span>M</span><span>J</span><span>K</span></div><p><strong>Small steps. Real progress.</strong><br />Build confidence one practice at a time.</p></div></div><div className="hero-visual"><div className="hero-visual-label"><span className="visual-label-icon"><Mic2 size={15} /></span> YOUR PERSONAL PRACTICE ROOM</div><DashboardPreview /><div className="floating-insight"><span className="insight-icon"><Check size={15} /></span><span><strong>You’re finding your rhythm</strong><small>Keep up the great work</small></span></div><div className="visual-caption"><span className="caption-line" /> A little preparation goes a long way <ArrowDown size={14} /></div></div></div><a href="#features" className="hero-scroll" aria-label="Scroll to features"><ArrowDown size={16} /></a></section>

      <section className="trust-strip"><div className="trust-inner"><span>MADE FOR THE MOMENTS THAT MOVE YOU</span><div><span><Target size={16} /> Focused practice</span><span><Clock3 size={16} /> Your own pace</span><span><ShieldCheck size={16} /> A private space</span></div></div></section>

      <section className="features-section" id="features"><div className="section-inner"><div className="section-heading"><span className="section-eyebrow">A BETTER WAY TO PREPARE</span><h2>Turn “what if?” into<br /><span>“I’ve got this.”</span></h2><p>Great interviews aren’t improvised. They’re built with practice that helps you feel prepared, present, and like yourself.</p></div><div className="feature-grid">{features.map(({ Icon, title, text }, index) => <article className="feature-card" key={title}><span className={`feature-icon feature-icon-${index}`}><Icon size={21} /></span><span className="feature-number">0{index + 1}</span><h3>{title}</h3><p>{text}</p><Link to="/signup" aria-label={`Learn more about ${title}`}><ArrowUpRight size={17} /></Link></article>)}</div></div></section>

      <section className="how-section" id="how-it-works"><div className="how-inner"><div className="how-intro"><span className="section-eyebrow">THREE STEPS. A LOT MORE CONFIDENCE.</span><h2>Make your next interview feel a little more familiar.</h2><p>Start where you are. Practice at your own pace. Take the confidence with you.</p><Link className="text-link" to="/signup">Find your starting point <ArrowRight size={17} /></Link></div><div className="steps-list">{steps.map((step) => <article className="step-item" key={step.number}><span className="step-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><ArrowUpRight className="step-arrow" size={18} /></article>)}</div></div></section>

      <section className="quote-section"><div className="quote-inner"><span className="quote-mark">“</span><blockquote>The best version of you is already there. We’ll help you bring them into the room.</blockquote><div className="quote-credit"><span className="quote-credit-line" /> A more confident way to prepare</div><span className="quote-decoration"><CircleHelp size={23} /></span></div></section>

      <section className="faq-section" id="faq"><div className="faq-inner"><div className="faq-heading"><span className="section-eyebrow">GOOD QUESTIONS</span><h2>A few things you<br />might be wondering.</h2><p>Still curious? <a href="mailto:hello@prepnova.app">We’d love to hear from you.</a></p></div><div className="faq-list">{faqs.map(([question, answer], index) => <article className={`faq-item${openFaq === index ? ' faq-open' : ''}`} key={question}><button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown size={18} /></button>{openFaq === index && <p>{answer}</p>}</article>)}</div></div></section>

      <section className="final-cta"><div className="final-cta-inner"><span className="final-cta-icon"><Sparkles size={19} /></span><h2>Your next opportunity is worth preparing for.</h2><p>Take the first step today. Your future self will thank you.</p><Link to="/signup" className="final-cta-button">Let’s get you ready <ArrowRight size={17} /></Link><div className="final-cta-note"><Check size={14} /> Free to get started <span /> No credit card needed</div></div></section>

      <footer className="landing-footer"><div className="footer-inner"><Brand light /><span className="footer-note">A little more ready, every day.</span><div className="footer-links"><Link to="/login">Log in</Link><Link to="/signup">Get started</Link><a href="mailto:hello@prepnova.app">Contact</a></div><span className="footer-copy">© {new Date().getFullYear()} PrepNova</span></div></footer>
    </main>
  )
}
