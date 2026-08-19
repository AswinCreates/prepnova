import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from './Button'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex flex-wrap justify-between items-center gap-3">
      <Link to="/dashboard" className="text-xl font-bold text-primary">
        PrepNova
      </Link>

      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <Link to="/dashboard" className="text-sm text-gray-600 hover:text-primary">
          Dashboard
        </Link>
        <Link to="/profile" className="text-sm text-gray-600 hover:text-primary">
          Profile
        </Link>
        <span className="text-sm text-gray-500">Hi, {user?.name}</span>
        <Button variant="outline" onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </nav>
  )
}