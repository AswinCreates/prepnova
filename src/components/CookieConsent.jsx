import { useEffect, useRef, useState } from 'react'
import { Cookie, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { COOKIE_CONSENT_EVENT, getCookieConsent, saveCookieConsent } from '../utils/cookieConsent'

export default function CookieConsent() {
  const { user, loading } = useAuth()
  const [consent, setConsent] = useState(getCookieConsent)
  const [open, setOpen] = useState(() => getCookieConsent() === null)
  const [saving, setSaving] = useState(false)
  const pendingPreferenceRef = useRef(null)

  useEffect(() => {
    const onConsentChange = (event) => {
      setConsent(event.detail)
      setOpen(false)
    }
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange)
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange)
  }, [])

  useEffect(() => {
    if (loading || !pendingPreferenceRef.current) return
    const preference = pendingPreferenceRef.current
    pendingPreferenceRef.current = null
    if (!user) return
    api.post('/auth/remember-me', { rememberMe: preference === 'accepted' })
      .catch((error) => toast.error(error.response?.data?.message || 'Could not update your sign-in cookie preference'))
  }, [user, loading])

  const chooseConsent = async (choice) => {
    if (saving) return
    saveCookieConsent(choice)
    setConsent(choice)
    setOpen(false)
    if (user) {
      setSaving(true)
      try {
        await api.post('/auth/remember-me', { rememberMe: choice === 'accepted' })
      } catch (error) {
        toast.error(error.response?.data?.message || 'Could not update your sign-in cookie preference')
      } finally {
        setSaving(false)
      }
    } else if (loading) pendingPreferenceRef.current = choice
  }

  return (
    <>
      {open ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[100] w-[min(28rem,calc(100vw-2rem))] sm:bottom-5 sm:right-5">
          <section role="dialog" aria-label="Cookie preferences" aria-live="polite" className="pointer-events-auto w-full rounded-2xl border border-line/70 bg-panel/75 p-4 text-ink shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Cookie size={20} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold">Cookie preferences</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">PrepNova uses an essential session cookie to keep you signed in while using the app. Accept to allow a persistent sign-in cookie that remembers you for 30 days; deny to use session-only sign-in.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => chooseConsent('denied')} disabled={saving} className="min-h-10 rounded-xl border border-line px-4 text-xs font-semibold text-ink transition hover:bg-panel2 disabled:opacity-60">Deny</button>
              <button type="button" onClick={() => chooseConsent('accepted')} disabled={saving} className="min-h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-60">Accept</button>
            </div>
          </section>
        </div>
      ) : consent === 'denied' ? (
        <button type="button" onClick={() => setOpen(true)} className="fixed bottom-3 right-3 z-[90] inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-panel/75 px-3 py-2 text-[10px] font-medium text-muted shadow-lg backdrop-blur-xl transition hover:text-primary sm:bottom-4 sm:right-4" aria-label="Open cookie preferences">
          <Settings2 size={13} /> Cookie settings
        </button>
      ) : null}
    </>
  )
}
