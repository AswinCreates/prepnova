import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle global auth failures: clear session and redirect to login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const url = error.config?.url || ''
      const isAuthRequest = ['/auth/me', '/auth/login', '/auth/register', '/auth/logout'].some((path) => url.includes(path))
      const isAuthPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/signup')
      if (!isAuthRequest && !isAuthPage) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default api
