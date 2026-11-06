import { Link } from 'react-router-dom'
import { ArrowRight, Check, CircleHelp, Construction, Sparkles, Wrench } from 'lucide-react'
import brandMark from '../assets/prepnova_logo.png'
import './MaintenancePage.css'

export default function MaintenancePage({ message }) {
  return (
    <main className="maintenance-page">
      <div className="maintenance-grid" aria-hidden="true" />
      <header className="maintenance-brand">
        <span className="maintenance-brand-mark"><img src={brandMark} alt="" /></span>
        <span>PrepNova</span>
      </header>

      <section className="maintenance-card" aria-labelledby="maintenance-title">
        <div className="maintenance-art" aria-hidden="true">
          <span className="maintenance-orbit maintenance-orbit-a" />
          <span className="maintenance-orbit maintenance-orbit-b" />
          <span className="maintenance-spark maintenance-spark-a"><Sparkles size={18} /></span>
          <span className="maintenance-spark maintenance-spark-b"><Sparkles size={13} /></span>
          <span className="maintenance-tool maintenance-tool-a"><Wrench size={23} /></span>
          <span className="maintenance-tool maintenance-tool-b"><Construction size={30} /></span>
          <span className="maintenance-progress"><i /><i /><i /><i /><i /></span>
          <span className="maintenance-check"><Check size={17} /></span>
        </div>

        <div className="maintenance-copy">
          <span className="maintenance-status"><span /> A quick tune-up is underway</span>
          <h1 id="maintenance-title">We’re making PrepNova even better.</h1>
          <p>{message || 'Our team is working behind the scenes. Your practice progress is safe, and we’ll be back shortly.'}</p>
          <div className="maintenance-note"><CircleHelp size={16} /><span>Nothing you have saved will be lost. Please check back in a little while.</span></div>
          <button type="button" className="maintenance-retry" onClick={() => window.location.reload()}>
            Check again <ArrowRight size={16} />
          </button>
          <Link to="/login" className="maintenance-admin-link">Administrator sign in</Link>
        </div>
      </section>

      <p className="maintenance-footer">A little work now, a smoother interview practice next.</p>
    </main>
  )
}
