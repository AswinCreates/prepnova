import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Volume2, LoaderCircle } from 'lucide-react'
import Button from './Button'
import api from '../services/api'

function readAsBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('Could not read the audio recording.'))
    reader.readAsDataURL(blob)
  })
}

export default function SpeechInterview({ question, initialAnswer = '', initialRecording = null, onAnswerSubmitted }) {
  const [isListening, setIsListening] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState(initialAnswer)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [captionStatus, setCaptionStatus] = useState('idle')
  const [captionMessage, setCaptionMessage] = useState('')
  const [pendingRecording, setPendingRecording] = useState(initialRecording)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState('')
  const recorderRef = useRef(null)
  const recognitionRef = useRef(null)
  const captionTimerRef = useRef(null)
  const fallbackTimerRef = useRef(null)
  const fallbackRecorderRef = useRef(null)
  const fallbackQueueRef = useRef([])
  const fallbackWorkerRef = useRef(false)
  const fallbackActiveRef = useRef(false)
  const recordingActiveRef = useRef(false)
  const recordingSessionRef = useRef(0)
  const captionStatusRef = useRef('idle')
  const streamRef = useRef(null)
  const mountedRef = useRef(true)
  const startingRef = useRef(false)

  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!window.MediaRecorder

  const updateCaptionStatus = (status, message = '') => {
    captionStatusRef.current = status
    if (mountedRef.current) {
      setCaptionStatus(status)
      setCaptionMessage(message)
    }
  }

  const stopLiveCaptions = () => {
    window.clearTimeout(captionTimerRef.current)
    captionTimerRef.current = null
    const recognition = recognitionRef.current
    recognitionRef.current = null
    try { recognition?.stop() } catch { /* Recognition may already have stopped. */ }
  }

  const stopAiCaptionFallback = () => {
    fallbackActiveRef.current = false
    window.clearTimeout(fallbackTimerRef.current)
    fallbackTimerRef.current = null
    fallbackQueueRef.current = []
    const fallbackRecorder = fallbackRecorderRef.current
    fallbackRecorderRef.current = null
    if (fallbackRecorder?.state === 'recording') {
      fallbackRecorder.onstop = null
      try { fallbackRecorder.stop() } catch { /* Recorder may already have stopped. */ }
    }
  }

  const startLiveCaptions = (startFallback) => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setLiveTranscript('')
    setInterimTranscript('')
    if (!Recognition) {
      startFallback('Browser live captions are unavailable. Switching to PrepNova transcription…')
      return
    }

    try {
      const recognition = new Recognition()
      recognition.lang = 'en-IN'
      recognition.continuous = true
      recognition.interimResults = true
      recognitionRef.current = recognition
      updateCaptionStatus('connecting', 'Connecting live captions…')

      recognition.onstart = () => {
        window.clearTimeout(captionTimerRef.current)
        captionTimerRef.current = null
        updateCaptionStatus('listening', 'Live captions are on')
      }
      recognition.onresult = (event) => {
        let finalized = ''
        let interim = ''
        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index]
          const text = result[0]?.transcript || ''
          if (result.isFinal) finalized += `${text} `
          else interim += `${text} `
        }
        if (mountedRef.current) {
          setLiveTranscript(finalized.trim())
          setInterimTranscript(interim.trim())
        }
      }
      recognition.onerror = (event) => {
        if (!recordingActiveRef.current) return
        const reason = event.error === 'network'
          ? 'Browser captions lost their network connection. Switching to PrepNova transcription…'
          : event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'Browser captions are blocked by permission. Switching to PrepNova transcription…'
            : 'Browser captions paused. Switching to PrepNova transcription…'
        stopLiveCaptions()
        startFallback(reason)
      }
      recognition.onend = () => {
        if (recognitionRef.current === recognition) recognitionRef.current = null
        if (recordingActiveRef.current && captionStatusRef.current !== 'unavailable') {
          startFallback('Browser captions stopped. Switching to PrepNova transcription…')
        }
      }
      recognition.start()
      captionTimerRef.current = window.setTimeout(() => {
        if (captionStatusRef.current === 'connecting' && recordingActiveRef.current) {
          stopLiveCaptions()
          startFallback('Browser captions did not connect. Switching to PrepNova transcription…')
        }
      }, 5000)
    } catch {
      stopLiveCaptions()
      startFallback('Browser captions could not start. Switching to PrepNova transcription…')
    }
  }

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
      const base64 = await readAsBase64(blob)
      const response = await api.post('/interviews/transcribe', { audio: base64, mimeType }, { timeout: 130_000 })
      const text = response.data.transcript?.trim()
      if (!text) throw new Error('No clear speech was detected. Please record again or use typed answer mode.')
      if (mountedRef.current) {
        setTranscript(text)
        setPendingRecording({ audio: base64, mimeType })
        setLiveTranscript('')
        setInterimTranscript('')
        updateCaptionStatus('idle')
      }
    } catch (err) {
      if (mountedRef.current) setError(err.response?.data?.message || err.message || 'Could not transcribe the recording. Check your connection and try again.')
    } finally {
      if (mountedRef.current) setIsTranscribing(false)
    }
  }, [])

  const startListening = async () => {
    if (startingRef.current || isListening || isTranscribing || isSpeaking) return
    const recordingSession = recordingSessionRef.current + 1
    recordingSessionRef.current = recordingSession
    startingRef.current = true
    setIsStarting(true)
    setError('')
    setTranscript('')
    setPendingRecording(null)
    setLiveTranscript('')
    setInterimTranscript('')
    setCaptionMessage('')
    updateCaptionStatus('idle')
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
      const startFallback = (message) => {
        updateCaptionStatus('fallback', message)
        if (fallbackActiveRef.current) return
        fallbackActiveRef.current = true

        const processQueue = async () => {
          if (fallbackWorkerRef.current) return
          fallbackWorkerRef.current = true
          while (fallbackQueueRef.current.length) {
            const item = fallbackQueueRef.current.shift()
            if (!fallbackActiveRef.current || item.session !== recordingSessionRef.current) continue
            try {
              const audio = await readAsBase64(item.blob)
              const response = await api.post('/interviews/transcribe', { audio, mimeType: item.mimeType }, { timeout: 45_000 })
              const segmentText = response.data.transcript?.trim()
              if (recordingActiveRef.current && fallbackActiveRef.current && recordingSessionRef.current === item.session && segmentText) {
                setLiveTranscript((previous) => [previous, segmentText].filter(Boolean).join(' '))
                setInterimTranscript('')
                updateCaptionStatus('fallback', 'Live transcript · PrepNova AI')
              }
            } catch (captionError) {
              if (captionError.response?.status === 422) continue
              if (recordingSessionRef.current === item.session && recordingActiveRef.current) {
                stopAiCaptionFallback()
                updateCaptionStatus('unavailable', 'PrepNova live transcription could not connect. Recording continues; the final transcript will be ready after you stop.')
              }
            }
          }
          fallbackWorkerRef.current = false
        }

        const captureSegment = () => {
          if (!fallbackActiveRef.current || !recordingActiveRef.current || recordingSessionRef.current !== recordingSession) return
          try {
            const segment = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
            const segmentChunks = []
            segment.ondataavailable = (event) => {
              if (event.data.size) segmentChunks.push(event.data)
            }
            segment.onstop = () => {
              if (fallbackRecorderRef.current === segment) fallbackRecorderRef.current = null
              if (!fallbackActiveRef.current || !recordingActiveRef.current || recordingSessionRef.current !== recordingSession) return
              const type = segment.mimeType || mimeType || 'audio/webm'
              const blob = new Blob(segmentChunks, { type })
              if (blob.size) {
                fallbackQueueRef.current.push({ blob, mimeType: type, session: recordingSession })
                void processQueue()
              }
              captureSegment()
            }
            segment.start()
            fallbackRecorderRef.current = segment
            fallbackTimerRef.current = window.setTimeout(() => {
              if (segment.state === 'recording') segment.stop()
            }, 6500)
          } catch {
            stopAiCaptionFallback()
            updateCaptionStatus('unavailable', 'PrepNova live transcription could not start. Recording continues; the final transcript will be ready after you stop.')
          }
        }

        captureSegment()
      }
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onstop = () => {
        recordingActiveRef.current = false
        stopLiveCaptions()
        stopAiCaptionFallback()
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
        recordingActiveRef.current = false
        stopLiveCaptions()
        stopAiCaptionFallback()
        stream.getTracks().forEach((track) => track.stop())
        if (streamRef.current === stream) streamRef.current = null
        if (mountedRef.current) {
          setError('Microphone recording failed. Please check microphone access and try again.')
          setIsListening(false)
        }
      }
      recorderRef.current = recorder
      recorder.start(1000)
      recordingActiveRef.current = true
      setIsListening(true)
      startLiveCaptions(startFallback)
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
    recordingActiveRef.current = false
    stopLiveCaptions()
    stopAiCaptionFallback()
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      recordingActiveRef.current = false
      stopLiveCaptions()
      stopAiCaptionFallback()
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
    onAnswerSubmitted?.(answer, pendingRecording)
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

      {isListening && <section aria-live="polite" aria-label="Live speech transcript" className="rounded-xl border border-line bg-panel p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-ink">Live transcript</span>
          {(captionStatus === 'listening' || captionStatus === 'fallback') && <span className="inline-flex items-center gap-1.5 text-[11px] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />{captionStatus === 'fallback' ? 'AI captions' : 'Listening'}</span>}
        </div>
        {liveTranscript || interimTranscript
          ? <p className="min-h-12 whitespace-pre-wrap text-sm leading-relaxed text-ink">{liveTranscript}{liveTranscript && interimTranscript ? ' ' : ''}<span className="text-muted">{interimTranscript}</span></p>
          : <p className="min-h-12 text-sm text-muted">{captionStatus === 'unavailable' ? 'No live words captured yet.' : captionMessage || (captionStatus === 'connecting' ? 'Connecting to captions…' : 'Speak to see captions here.')}</p>}
        {captionStatus === 'unavailable' && captionMessage && <p className="mt-2 text-[11px] leading-relaxed text-muted">{captionMessage}</p>}
      </section>}

      {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-center text-sm text-danger">{error}</p>}

      <textarea
        aria-label="Review and edit your transcribed answer"
        value={transcript}
        onChange={(event) => setTranscript(event.target.value)}
        placeholder="Your transcribed answer will appear here after recording…"
        rows={4}
        disabled={isListening || isTranscribing}
        className="min-h-[110px] w-full resize-y rounded-xl border border-line bg-panel p-3 text-sm text-ink placeholder:text-muted shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-70"
      />
      {transcript && <p className="text-xs text-muted">Review and correct names or words here before using your answer.</p>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={speakQuestion} disabled={isSpeaking || isStarting || isListening || isTranscribing}>
          <Volume2 size={16} className="mr-1.5 inline" />{isSpeaking ? 'Speaking…' : 'Hear Question'}
        </Button>
        <Button onClick={handleUseAnswer} disabled={!transcript.trim() || isListening || isTranscribing}>Use this answer</Button>
      </div>
      <p className="text-center text-[11px] text-muted">Voice delivery feedback will appear in your report after the interview.</p>
    </div>
  )
}
