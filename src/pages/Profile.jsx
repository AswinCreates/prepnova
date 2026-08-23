import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [domain, setDomain] = useState(user?.preferredDomain || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.put('/users/profile', {
        name,
        preferredDomain: domain,
        targetSkills: [],
      })
      updateUser({
        name: data.user.name,
        email: data.user.email,
        preferredDomain: data.user.preferredDomain,
        targetSkills: data.user.targetSkills,
      })
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-lg mx-auto p-6 animate-fade-in-up">
        <Card>
          <div className="flex items-center justify-center mb-2">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary/20">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Your Profile</h1>
          <p className="text-sm text-gray-500 mb-6">Manage your personal information</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Preferred Domain"
              placeholder="e.g. Web Development, Data Science"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}