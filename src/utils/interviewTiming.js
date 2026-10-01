export const INTERVIEW_TIME_LIMITS = {
  Easy: 3 * 60,
  Medium: 2 * 60 + 45,
  Hard: 2 * 60,
}

export function getQuestionTimeLimit(difficulty) {
  return INTERVIEW_TIME_LIMITS[difficulty] ?? INTERVIEW_TIME_LIMITS.Medium
}

export function formatTimeLimit(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')} minutes`
}
