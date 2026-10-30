import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Input from '../components/Input'
import AuthPageLayout from '../components/AuthPageLayout'
import SwipeSubmitButton from '../components/SwipeSubmitButton'
import { COOKIE_CONSENT_EVENT, getCookieConsent } from '../utils/cookieConsent'
import '../styles/AuthPages.css'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cookieConsent, setCookieConsent] = useState(getCookieConsent)
  const [rememberMe, setRememberMe] = useState(() => getCookieConsent() === 'accepted')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const formRef = useRef(null)
  const { signup } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onConsentChange = (event) => {
      setCookieConsent(event.detail)
      setRememberMe(event.detail === 'accepted')
    }
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange)
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange)
  }, [])

  const validateFields = () => {
    const nextErrors = {}
    const normalizedName = name.trim()
    const normalizedEmail = email.trim()
    if (!normalizedName) nextErrors.name = 'Enter your name.'
    else if (normalizedName.length < 2) nextErrors.name = 'Your name must be at least 2 characters.'
    if (!normalizedEmail) nextErrors.email = 'Enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) nextErrors.email = 'Enter a valid email address.'
    if (!password) nextErrors.password = 'Create a password to continue.'
    else if (password.length < 6) nextErrors.password = 'Your password must be at least 6 characters.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const clearFieldError = (field) => setErrors((current) => {
    if (!current[field]) return current
    const next = { ...current }
    delete next[field]
    return next
  })

  const submitFromSwipe = () => {
    if (!validateFields() || !formRef.current) return false
    formRef.current.requestSubmit()
    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validateFields()) return
    setLoading(true)
    try {
      await signup(name.trim(), email.trim(), password, rememberMe)
      toast.success('Account created successfully')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout mode="signup">
      <div className="auth-form-card">
        <form ref={formRef} onSubmit={handleSubmit} className="auth-form" noValidate>
          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" disabled={loading}>Submit signup form</button>
          <Input label="Full name" type="text" name="name" autoComplete="name" placeholder="How should we call you?" value={name} onChange={(event) => { setName(event.target.value); clearFieldError('name') }} minLength={2} maxLength={120} required error={errors.name} leadingIcon={<UserRound size={17} />} />
          <Input label="Email address" type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => { setEmail(event.target.value); clearFieldError('email') }} maxLength={255} required error={errors.email} leadingIcon={<Mail size={17} />} />
          <div className="auth-password-field">
            <Input label="Password" type={showPassword ? 'text' : 'password'} name="new-password" autoComplete="new-password" placeholder="At least 6 characters" value={password} onChange={(event) => { setPassword(event.target.value); clearFieldError('password') }} minLength={6} maxLength={128} required error={errors.password} leadingIcon={<LockKeyhole size={17} />} />
            <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            <p className="auth-field-hint">Use at least 6 characters.</p>
          </div>
          <label className="auth-remember">
            <input type="checkbox" checked={rememberMe} disabled={cookieConsent !== 'accepted'} onChange={(event) => setRememberMe(event.target.checked)} />
            <span><strong>Remember me for 30 days</strong><small>{cookieConsent === 'accepted' ? 'You can turn off the persistent sign-in cookie for this login.' : 'Accept cookies to enable 30-day sign-in.'}</small></span>
          </label>
          <SwipeSubmitButton label="Create account" loading={loading} onComplete={submitFromSwipe} />
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </AuthPageLayout>
  )
}
