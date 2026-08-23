/**
 * SpeechInterview.jsx
 * -------------------------------------------------------------------------
 * PrepNova - Speech-to-Speech interview mode using the browser's FREE
 * built-in Web Speech API:
 *   - SpeechRecognition  -> converts the candidate's spoken answer to text (STT)
 *   - SpeechSynthesis    -> reads the interview question aloud (TTS)
 *
 * No API key, no cost. Best supported in Chrome / Edge; Firefox and Safari
 * have partial SpeechRecognition support.
 *
 * Fixes that make capture reliable:
 *   - `onresult` separates FINAL vs INTERIM results using resultIndex so the
 *     transcript never duplicates/garbles as Chrome finalises partials.
 *   - Chrome/Edge stop `continuous` recognition after short silence, so the
 *     component AUTO-RESTARTS on `onend` while the user still wants to
 *     listen. The mic keeps capturing until explicitly stopped.
 *   - On "not-allowed" (mic denied) a clear message is shown.
 *
 * It is a CONTROLLED recorder: hands the captured text up via
 * `onAnswerSubmitted(text)`; the parent owns submission.
 * -------------------------------------------------------------------------
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import Button from './Button'

const EQ_DELAYS = ['0ms', '150ms', '300ms', '150ms', '0ms']

export default function SpeechInterview({ question, onAnswerSubmitted }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState('')

  const recognitionRef = useRef(null)
  const finalRef = useRef('') // accumulated FINAL results

  // Detect Web Speech support once (outside any effect).
  const supported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition) &&
    !!window.speechSynthesis

  // Set up recognition once per mount.
  useEffect(() => {
    if (!supported) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'

    const startRec = () => {
      if (!recognition.shouldListen) return
      try {
        recognition.start()
      } catch {
        /* already started/starting — harmless */
      }
    }

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        if (res.isFinal) finalRef.current += res[0].transcript
        else interim += res[0].transcript
      }
      const current = (finalRef.current + (interim ? ' ' + interim : '')).trim()
      setTranscript(current)
    }

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Microphone permission denied. Allow the mic in your browser settings and try again.')
        recognition.shouldListen = false
        setIsListening(false)
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setError(`Speech error: ${e.error}`)
      }
    }

    recognition.onend = () => {
      // Keep listening through browser-imposed silence pauses.
      if (recognition.shouldListen) {
        startRec()
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.shouldListen = false
      try {
        recognition.abort()
      } catch {
        /* noop */
      }
    }
  }, [supported])

  // Read the question aloud (TTS).
  const speakQuestion = useCallback(() => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(question)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [question])

  const startListening = () => {
    const rec = recognitionRef.current
    if (!rec) return
    setError('')
    finalRef.current = ''
    setTranscript('')
    rec.shouldListen = true
    try {
      rec.start()
      setIsListening(true)
    } catch {
      setIsListening(false)
    }
  }

  const stopListening = () => {
    const rec = recognitionRef.current
    if (!rec) return
    rec.shouldListen = false
    try {
      rec.stop()
    } catch {
      /* noop */
    }
  }

  const toggleListening = () => {
    if (isListening) stopListening()
    else startListening()
  }

  const handleUseAnswer = () => {
    if (!transcript.trim()) return
    onAnswerSubmitted?.(transcript)
    finalRef.current = ''
    setTranscript('')
  }
if (!supported) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-gray-700 animate-fade-in-up">
        Your browser doesn’t support the Web Speech API. Switch to{" "}
        <span className="font-semibold">Typed</span> mode or use Chrome/Edge for voice interviews.
      </div>
    )
  }

  const status =
    isListening ? 'Listening…' : isSpeaking ? 'Speaking…' : 'Tap the mic to start'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-5 flex flex-col gap-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Spoken answer</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isListening
              ? 'bg-danger/10 text-danger'
              : isSpeaking
              ? 'bg-primary/10 text-primary'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isListening ? 'bg-danger animate-ping' : isSpeaking ? 'bg-primary' : 'bg-gray-400'
            }`}
          />
          {status}
        </span>
      </div>

      {/* Microphone toggle with animated rings */}
      <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-danger/20 animate-ping" />
            <span className="absolute inset-3 rounded-full bg-danger/25 animate-pulse" />
          </>
        )}
        <button
          type="button"
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
          onClick={toggleListening}
          className={`relative flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-lg transition-all duration-200 active:scale-90 ${
            isListening
              ? 'bg-gradient-to-br from-danger to-rose-500 text-white animate-pulse-ring'
              : 'bg-gradient-to-br from-primary to-primary-dark text-white hover:scale-105 hover:shadow-xl'
          }`}
        >
          <span className={isListening ? 'text-xl' : ''}>{isListening ? '⏹' : '🎙️'}</span>
        </button>
      </div>

      {/* Live equalizer bars while listening */}
      <div className="flex h-6 items-end justify-center gap-1" aria-hidden="true">
        {EQ_DELAYS.map((d, i) => (
          <span
            key={i}
            className={`w-1.5 rounded-full bg-gradient-to-t from-danger to-rose-300 ${
              isListening ? 'animate-eq' : ''
            }`}
            style={{ height: isListening ? '100%' : '30%', animationDelay: d, opacity: isListening ? 1 : 0.4 }}
          />
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-center text-sm text-danger">{error}</p>
      )}

      {/* Live transcript */}
      <div className="min-h-[76px] rounded-xl border border-gray-200 bg-white p-3 text-sm whitespace-pre-wrap shadow-inner">
        {transcript || <span className="text-gray-400">Your spoken answer will appear here…</span>}
        {isListening && (
          <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-primary align-middle" />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={speakQuestion} disabled={isSpeaking}>
          {isSpeaking ? '🔊 Speaking…' : '🔊 Hear Question'}
        </Button>
        <Button onClick={handleUseAnswer} disabled={!transcript.trim()}>
          Use this answer
        </Button>
      </div>
    </div>
  )
}