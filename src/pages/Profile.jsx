import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [domain, setDomain] = useState(user?.domain || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // TEMPORARY MOCK — replace with real PUT /api/user/profile call once backend is ready
      await new Promise((resolve) => setTimeout(resolve, 500))
      updateUser({ name, email, domain })
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
      <div className="max-w-lg mx-auto p-6">
        <Card>
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