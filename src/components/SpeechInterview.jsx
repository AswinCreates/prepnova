import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Volume2, LoaderCircle } from 'lucide-react'
import Button from './Button'
import api from '../services/api'

export default function SpeechInterview({ question, onAnswerSubmitted }) {
  const [isListening, setIsListening] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState('')
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const mountedRef = useRef(true)
  const startingRef = useRef(false)

  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!window.MediaRecorder

  const transcribeRecording = useCallback(async (blob, mimeType) => {
    if (!blob.size) {
      if (mountedRef.current) setError('No audio was captured. Check your microphone and try again.')
      return
    }
    if (blob.size > 14_000_000) {
      if (mountedRef.current) setError('That recording is too large to transcribe. Please record a shorter answer.')
      return
    }
    if (mountedRef.current) {
      setIsTranscribing(true)
      setError('')
    }
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
        reader.onerror = () => reject(new Error('Could not read the audio recording.'))
        reader.readAsDataURL(blob)
      })
      const response = await api.post('/interviews/transcribe', { audio: base64, mimeType }, { timeout: 130_000 })
      const text = response.data.transcript?.trim()
      if (!text) throw new Error('No clear speech was detected. Please record again or use typed answer mode.')
      if (mountedRef.current) setTranscript(text)
    } catch (err) {
      if (mountedRef.current) setError(err.response?.data?.message || err.message || 'Could not transcribe the recording. Check your connection and try again.')
    } finally {
      if (mountedRef.current) setIsTranscribing(false)
    }
  }, [])

  const startListening = async () => {
    if (startingRef.current || isListening || isTranscribing || isSpeaking) return
    startingRef.current = true
    setIsStarting(true)
    setError('')
    setTranscript('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: { ideal: 1 },
        },
      })
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      const chunks = []
      let recordingFailed = false
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        if (streamRef.current === stream) streamRef.current = null
        if (mountedRef.current) setIsListening(false)
        if (mountedRef.current && !recordingFailed) {
          const actualMimeType = recorder.mimeType || 'audio/webm'
          void transcribeRecording(new Blob(chunks, { type: actualMimeType }), actualMimeType)
        }
      }
      recorder.onerror = () => {
        recordingFailed = true
        stream.getTracks().forEach((track) => track.stop())
        if (streamRef.current === stream) streamRef.current = null
        if (mountedRef.current) {
          setError('Microphone recording failed. Please check microphone access and try again.')
          setIsListening(false)
        }
      }
      recorderRef.current = recorder
      recorder.start(1000)
      setIsListening(true)
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      const message = err.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow microphone access in your browser settings and try again.'
        : err.name === 'NotFoundError'
          ? 'No microphone was found. Connect a microphone or use typed answer mode.'
          : err.name === 'NotReadableError'
            ? 'The microphone is busy in another app. Close other recording apps and try again.'
            : 'Could not access the microphone. Check browser permissions and try again.'
      if (mountedRef.current) setError(message)
    } finally {
      startingRef.current = false
      if (mountedRef.current) setIsStarting(false)
    }
  }

  const stopListening = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      window.speechSynthesis?.cancel()
    }
  }, [])

  const speakQuestion = () => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    if (typeof SpeechSynthesisUtterance === 'undefined') {
      setError('Question audio is not available in this browser. You can still record or type your answer.')
      return
    }
    const utterance = new SpeechSynthesisUtterance(question)
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const handleUseAnswer = () => {
    const answer = transcript.trim()
    if (!answer || isListening || isTranscribing) return
    onAnswerSubmitted?.(answer)
    setTranscript('')
  }

  if (!supported) {
    const message = typeof window !== 'undefined' && !window.isSecureContext
      ? 'Voice answers require a secure connection. Open PrepNova over HTTPS or localhost, or switch to Typed mode.'
      : 'Your browser does not support microphone recording. Use Chrome or Edge, or switch to Typed mode.'
    return <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-ink">{message}</div>
  }

  const status = isStarting ? 'Starting microphone' : isListening ? 'Recording answer' : isTranscribing ? 'Transcribing answer' : isSpeaking ? 'Reading question' : 'Ready to record'

  return (
    <div className="rounded-2xl border border-line bg-panel/70 p-5 flex flex-col gap-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">Spoken answer</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isListening ? 'bg-danger/10 text-danger' : 'bg-panel2 text-muted'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isListening ? 'bg-danger animate-pulse' : 'bg-muted'}`} />{status}
        </span>
      </div>

      <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
        {isListening && <><span className="absolute inset-0 rounded-full bg-danger/20 animate-ping" /><span className="absolute inset-3 rounded-full bg-danger/25 animate-pulse" /></>}
        <button type="button" aria-label={isListening ? 'Stop recording' : 'Start recording'} onClick={isListening ? stopListening : startListening} disabled={isStarting || isTranscribing || isSpeaking}
          className={`relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 active:scale-90 disabled:opacity-60 ${isListening ? 'bg-danger animate-pulse' : 'bg-primary hover:scale-105'}`}>
          {isListening ? <MicOff size={23} /> : isStarting || isTranscribing ? <LoaderCircle className="animate-spin" size={23} /> : <Mic size={23} />}
        </button>
      </div>
      <p className="text-center text-xs text-muted">{isListening ? 'Speak your answer, then tap the mic to finish.' : isStarting ? 'Waiting for microphone access…' : isTranscribing ? 'Converting your recording to text…' : 'Your recording is transcribed after you finish.'}</p>

      {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-center text-sm text-danger">{error}</p>}

      <textarea
        aria-label="Review and edit your transcribed answer"
        value={transcript}
        onChange={(event) => setTranscript(event.target.value)}
        placeholder="Your transcribed answer will appear here after recording…"
        rows={4}
        disabled={isTranscribing}
        className="min-h-[110px] w-full resize-y rounded-xl border border-line bg-panel p-3 text-sm text-ink placeholder:text-muted shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-70"
      />
      {transcript && <p className="text-xs text-muted">Review and correct names or words here before using your answer.</p>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={speakQuestion} disabled={isSpeaking || isStarting || isListening || isTranscribing}>
          <Volume2 size={16} className="mr-1.5 inline" />{isSpeaking ? 'Speaking…' : 'Hear Question'}
        </Button>
        <Button onClick={handleUseAnswer} disabled={!transcript.trim() || isListening || isTranscribing}>Use this answer</Button>
      </div>
      <p className="text-center text-[11px] text-muted">Your recording is transcribed after you stop recording.</p>
    </div>
  )
}
