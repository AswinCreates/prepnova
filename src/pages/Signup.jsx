import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import { ThemeCycleButton } from '../components/ThemeToggle'
import { House } from 'lucide-react'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signup(name, email, password)
      toast.success('Account created successfully')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* animated gradient blobs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-secondary/15 blur-3xl animate-float" aria-hidden="true" />
      <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-primary/15 blur-3xl animate-float" aria-hidden="true" />
      <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-success/10 blur-3xl animate-float" aria-hidden="true" />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <Link
          to="/"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-panel2 px-3 text-sm font-medium text-ink transition-colors hover:border-primary/50 hover:text-primary"
        >
          <House size={15} />
          <span>Home</span>
        </Link>
        <ThemeCycleButton />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm animate-fade-in-up border-primary/20">
          <h1 className="text-3xl font-bold mb-1 text-primary">
            Create your account
          </h1>
          <p className="text-sm text-muted mb-6">Start practicing for your next interview</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" loading={loading}>
              Sign Up
            </Button>
          </form>

          <p className="text-sm text-muted mt-4 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
