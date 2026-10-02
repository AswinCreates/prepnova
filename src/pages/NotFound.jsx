import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Compass, House, Orbit, Search } from 'lucide-react'
import brandMark from '../assets/prepnova_logo.png'
import './NotFound.css'

export default function NotFound() {
  const navigate = useNavigate()

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <main className="not-found-page">
      <div className="not-found-grid" aria-hidden="true" />
      <div className="not-found-content">
        <Link to="/" className="not-found-brand" aria-label="PrepNova home">
          <span className="not-found-brand-mark"><img src={brandMark} alt="" /></span>
          <span>PrepNova</span>
        </Link>

        <section className="not-found-card" aria-labelledby="not-found-title">
          <div className="not-found-art" aria-hidden="true">
            <span className="not-found-orbit not-found-orbit-one" />
            <span className="not-found-orbit not-found-orbit-two" />
            <span className="not-found-star not-found-star-one" />
            <span className="not-found-star not-found-star-two" />
            <span className="not-found-star not-found-star-three" />
            <span className="not-found-planet"><Orbit size={45} strokeWidth={1.5} /></span>
            <span className="not-found-satellite"><Compass size={25} strokeWidth={1.7} /></span>
            <span className="not-found-number">404</span>
          </div>

          <div className="not-found-copy">
            <span className="not-found-kicker"><Search size={14} /> SIGNAL NOT FOUND</span>
            <h1 id="not-found-title">Looks like you took a wrong turn.</h1>
            <p>This page isn’t in our orbit. Let’s get you back to somewhere useful.</p>
            <div className="not-found-actions">
              <Link to="/" className="not-found-home"><House size={17} /> Back to home <ArrowRight size={16} /></Link>
              <button type="button" onClick={goBack} className="not-found-back"><ArrowLeft size={16} /> Go back</button>
            </div>
          </div>

          <span className="not-found-coordinate" aria-hidden="true">PN // 404 · ROUTE NOT MAPPED</span>
        </section>

        <p className="not-found-footer">Keep practicing. Your next opportunity is right around the corner.</p>
      </div>
    </main>
  )
}
