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
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-4 flex flex-wrap justify-between items-center gap-3 shadow-sm animate-fade-in-down">
      <Link
        to="/dashboard"
        className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hover:opacity-80 transition-opacity"
      >
        PrepNova
      </Link>

      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <Link
          to="/dashboard"
          className="text-sm text-gray-600 hover:text-primary transition-colors"
        >
          Dashboard
        </Link>
        <Link
          to="/profile"
          className="text-sm text-gray-600 hover:text-primary transition-colors"
        >
          Profile
        </Link>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-500">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Hi, {user?.name}
        </span>
        <Button variant="outline" onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </nav>
  )
}