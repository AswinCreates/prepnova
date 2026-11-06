import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'
import MaintenancePage from '../pages/MaintenancePage'

export default function MaintenanceGate({ children }) {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const [status, setStatus] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    const refresh = async (initial = false) => {
      try {
        const { data } = await api.get('/maintenance/status')
        if (active) setStatus(data)
      } catch {
        if (active) setStatus({ enabled: false, message: '' })
      } finally {
        if (active && initial) setChecking(false)
      }
    }

    refresh(true)
    const interval = window.setInterval(() => refresh(), 20000)
    const handleFocus = () => refresh()
    window.addEventListener('focus', handleFocus)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  if (authLoading || checking) return <div className="grid min-h-screen place-items-center bg-app"><Loader size="lg" /></div>
  // Keep sign-in reachable so an administrator can authenticate and disable
  // maintenance mode. Regular users return to the maintenance page after login.
  if (status?.enabled && location.pathname === '/login' && user?.role !== 'admin') return children
  if (status?.enabled && user?.role !== 'admin') return <MaintenancePage message={status.message} />
  return children
}
