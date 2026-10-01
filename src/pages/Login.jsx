import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import { ThemeCycleButton } from '../components/ThemeToggle'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const loggedInUser = await login(email, password)
      toast.success('Logged in successfully')
      navigate(loggedInUser?.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* animated gradient blobs */}
      <div
        className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl animate-float"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-secondary/15 blur-3xl animate-float"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-warning/10 blur-3xl animate-float"
        aria-hidden="true"
      />

      <div className="absolute right-4 top-4 z-10">
        <ThemeCycleButton />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm animate-fade-in-up border-primary/20">
          <h1 className="text-3xl font-bold mb-1 text-primary">
            Welcome back
          </h1>
          <p className="text-sm text-muted mb-6">Log in to continue your interview prep</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              Log In
            </Button>
          </form>

          <p className="text-sm text-muted mt-4 text-center">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
