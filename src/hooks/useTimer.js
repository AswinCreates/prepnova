import { useState, useEffect, useRef } from 'react'

export function useTimer(initialSeconds, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const onExpireRef = useRef(onExpire)

  // Keep the ref current outside of render (React 19 rule).
  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpireRef.current?.()
      return
    }
    const timer = setInterval(() => {
      setSecondsLeft((s) => s - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  const reset = (newSeconds) => setSecondsLeft(newSeconds)

  const formatted = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`

  return { secondsLeft, formatted, reset }
}