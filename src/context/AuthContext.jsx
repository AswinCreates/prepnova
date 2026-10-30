import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Validate the HttpOnly session cookie. This request also migrates an older
  // bearer-token session to a non-persistent cookie before removing the token.
  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        localStorage.removeItem('token')
        localStorage.setItem('user', JSON.stringify(res.data.user))
        setUser(res.data.user)
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password, rememberMe = false) => {
    const { data } = await api.post('/auth/login', { email, password, rememberMe })
    localStorage.removeItem('token')
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const signup = async (name, email, password, rememberMe = false) => {
    const { data } = await api.post('/auth/register', { name, email, password, rememberMe })
    localStorage.removeItem('token')
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch { /* Clear local app state even if the API is offline. */ }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, updateUser, isAuthenticated: !!user, loading }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Fast-refresh rule: exporting a hook alongside a component is intentional here.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
