import { createContext, useContext, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const login = async (email, password) => {
    // TEMPORARY MOCK — remove once backend /api/auth/login is ready
    await new Promise((resolve) => setTimeout(resolve, 500))
    const fakeUser = { name: 'Test User', email }
    const fakeToken = 'mock-jwt-token'

    localStorage.setItem('token', fakeToken)
    localStorage.setItem('user', JSON.stringify(fakeUser))
    setUser(fakeUser)
  }

  const signup = async (name, email, password) => {
    // TEMPORARY MOCK — remove once backend /api/auth/signup is ready
    await new Promise((resolve) => setTimeout(resolve, 500))
    const fakeUser = { name, email }
    const fakeToken = 'mock-jwt-token'

    localStorage.setItem('token', fakeToken)
    localStorage.setItem('user', JSON.stringify(fakeUser))
    setUser(fakeUser)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}