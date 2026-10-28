import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, LoaderCircle } from 'lucide-react'

export default function SwipeSubmitButton({ label, loading = false, onComplete }) {
  const trackRef = useRef(null)
  const dragRef = useRef(null)
  const completedRef = useRef(false)
  const ignoreClickRef = useRef(false)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!loading && completedRef.current) reset()
  }, [loading])

  const reset = () => {
    dragRef.current = null
    completedRef.current = false
    ignoreClickRef.current = false
    setDragging(false)
    setCompleted(false)
    setOffset(0)
  }

  const submit = () => {
    if (loading || completedRef.current) return
    const accepted = onComplete?.()
    if (accepted === false) {
      reset()
      return
    }
    completedRef.current = true
    setCompleted(true)
  }

  const handlePointerDown = (event) => {
    if (loading || event.button !== 0) return
    event.preventDefault()
    const trackBounds = trackRef.current.getBoundingClientRect()
    const thumbWidth = event.currentTarget.getBoundingClientRect().width
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      maxOffset: Math.max(0, trackBounds.width - thumbWidth - 10),
    }
    ignoreClickRef.current = true
    setDragging(true)
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const nextOffset = Math.max(0, Math.min(drag.maxOffset, event.clientX - drag.startX))
    setOffset(nextOffset)
  }

  const handlePointerUp = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const nextOffset = Math.max(0, Math.min(drag.maxOffset, event.clientX - drag.startX))
    const completed = drag.maxOffset === 0 || nextOffset / drag.maxOffset >= 0.82
    dragRef.current = null
    setDragging(false)

    if (completed) {
      setOffset(drag.maxOffset)
      submit()
    } else {
      setOffset(0)
    }

    window.setTimeout(() => { ignoreClickRef.current = false }, 0)
  }

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    submit()
  }

  const handleClick = (event) => {
    if (ignoreClickRef.current) {
      event.preventDefault()
      return
    }
    // Allows assistive technology to activate the swipe control as a button.
    if (event.detail === 0) submit()
  }

  return (
    <div className="swipe-submit-wrap">
      <div ref={trackRef} className={`swipe-submit-track${dragging ? ' is-dragging' : ''}${completed ? ' is-complete' : ''}`}>
        <span className="swipe-submit-label" aria-hidden="true">{completed ? 'You’re all set' : `Swipe to ${label.toLowerCase()}`}</span>
        <button
          type="button"
          className="swipe-submit-thumb"
          style={{ transform: `translateX(${offset}px)` }}
          disabled={loading}
          aria-label={`Hold and drag right to ${label.toLowerCase()}. Press Enter or Space to continue.`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={reset}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
        >
          {loading ? <LoaderCircle className="swipe-submit-spinner" size={20} /> : completed ? <Check size={20} /> : <ArrowRight className="swipe-submit-arrow" size={20} />}
        </button>
      </div>
      <p className="swipe-submit-hint">Hold the arrow and drag right <span aria-hidden="true">·</span> Press Enter to continue</p>
    </div>
  )
}
