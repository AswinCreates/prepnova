const STORAGE_KEY = 'prepnova_sessions'

// TEMPORARY — replace with real GET/POST /api/interview/history calls once backend is ready
export function saveSession(session) {
  const sessions = getSessions()
  sessions.unshift(session) // newest first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function getSessions() {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

export function clearSessions() {
  localStorage.removeItem(STORAGE_KEY)
}