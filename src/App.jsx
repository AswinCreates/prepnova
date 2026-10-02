import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import InterviewSetup from './pages/InterviewSetup'
import InterviewStart from './pages/InterviewStart'
import InterviewSession from './pages/InterviewSession'
import InterviewResults from './pages/InterviewResults'
import InterviewHistory from './pages/InterviewHistory'
import ErrorBoundary from './components/ErrorBoundary'
import LandingPage from './pages/LandingPage'
import AdminDashboard from './pages/AdminDashboard'
import Leaderboard from './pages/Leaderboard'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Authenticated area — shared left sidebar layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/interview/setup" element={<InterviewSetup />} />
              <Route path="/interview/start/:id" element={<InterviewStart />} />
              <Route path="/interview/session/:id" element={<InterviewSession />} />
              <Route path="/interview/results/:id" element={<InterviewResults />} />
              <Route path="/interview/history" element={<InterviewHistory />} />
            </Route>

            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
