import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Camera, CameraOff, LoaderCircle, ScanFace } from 'lucide-react'
import Button from './Button'

const EMPTY_METRICS = {
  enabled: false,
  sampleCount: 0,
  faceSamples: 0,
  noFaceEvents: 0,
  missingSince: null,
}

const FacePresenceMonitor = forwardRef(function FacePresenceMonitor({ onStartingChange }, ref) {
  const [status, setStatus] = useState('off')
  const [faceCount, setFaceCount] = useState(0)
  const [message, setMessage] = useState('If enabled, video stays on this device and is not uploaded or stored. Only an approximate summary is saved.')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const animationRef = useRef(null)
  const metricsRef = useRef({ ...EMPTY_METRICS })
  const lastDetectionAtRef = useRef(0)
  const lastVideoTimeRef = useRef(-1)

  useImperativeHandle(ref, () => ({
    getSummary() {
      const metrics = metricsRef.current
      if (!metrics.enabled || metrics.sampleCount === 0) return null
      const hadLongAbsence = metrics.missingSince !== null
        && performance.now() - metrics.missingSince >= 2000
      return {
        faceVisiblePercent: Math.round((metrics.faceSamples / metrics.sampleCount) * 100),
        noFaceEvents: metrics.noFaceEvents + (hadLongAbsence ? 1 : 0),
        sampleCount: metrics.sampleCount,
        durationSeconds: Math.round(metrics.sampleCount / 2),
      }
    },
  }), [])

  const stopCamera = () => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    detectorRef.current?.close()
    detectorRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setFaceCount(0)
    setStatus('off')
    onStartingChange?.(false)
  }

  const startCamera = async () => {
    if (status === 'starting' || status === 'active') return
    setStatus('starting')
    onStartingChange?.(true)
    setMessage('Requesting camera access and loading the on-device detector…')

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not available in this browser.')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      stream.getVideoTracks().forEach((track) => track.addEventListener('ended', () => {
        if (streamRef.current !== stream) return
        stopCamera()
        setStatus('error')
        setMessage('Camera disconnected. You can continue the interview without it.')
      }, { once: true }))
      const video = videoRef.current
      video.srcObject = stream
      await video.play()

      const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const assetsBase = import.meta.env.BASE_URL
      const vision = await FilesetResolver.forVisionTasks(`${assetsBase}mediapipe/wasm`)
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `${assetsBase}models/blaze_face_short_range.tflite` },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.6,
      })
      detectorRef.current = detector
      metricsRef.current = { ...EMPTY_METRICS, enabled: true }
      lastDetectionAtRef.current = 0
      lastVideoTimeRef.current = -1
      setMessage('Your camera stays on this device. Images are not saved or uploaded.')
      setStatus('active')
      onStartingChange?.(false)

      const detectFrame = () => {
        if (!videoRef.current || !detectorRef.current || !streamRef.current) return
        const now = performance.now()
        const currentVideo = videoRef.current
        if (document.visibilityState !== 'visible') metricsRef.current.missingSince = null
        if (document.visibilityState === 'visible'
          && currentVideo.readyState >= 2
          && currentVideo.currentTime !== lastVideoTimeRef.current
          && now - lastDetectionAtRef.current >= 500) {
          lastVideoTimeRef.current = currentVideo.currentTime
          lastDetectionAtRef.current = now
          const detections = detectorRef.current.detectForVideo(currentVideo, now).detections || []
          const detectedFaces = detections.filter((item) => (item.categories?.[0]?.score || 0) >= 0.6).length
          const metrics = metricsRef.current
          metrics.sampleCount += 1
          if (detectedFaces > 0) {
            metrics.faceSamples += 1
            if (metrics.missingSince !== null && now - metrics.missingSince >= 2000) metrics.noFaceEvents += 1
            metrics.missingSince = null
          } else if (metrics.missingSince === null) {
            metrics.missingSince = now
          }
          setFaceCount(detectedFaces)
        }
        animationRef.current = requestAnimationFrame(detectFrame)
      }
      animationRef.current = requestAnimationFrame(detectFrame)
    } catch (error) {
      stopCamera()
      setStatus('error')
      onStartingChange?.(false)
      const reason = error.name === 'NotAllowedError'
        ? 'Camera permission was denied. You can continue without camera check.'
        : error.message || 'Could not start the camera check. You can continue without it.'
      setMessage(reason)
    }
  }

  useEffect(() => () => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    detectorRef.current?.close()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  return (
    <section className="mb-4 rounded-2xl border border-line bg-panel p-4" aria-label="Optional camera presence check">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-panel2 sm:w-52">
          <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${status === 'active' ? '-scale-x-100' : 'hidden'}`} />
          {status !== 'active' && <div className="absolute inset-0 grid place-items-center text-muted"><CameraOff size={24} /></div>}
          {status === 'active' && <span className={`absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-medium ${faceCount > 0 ? 'bg-success/90 text-white' : 'bg-warning/90 text-white'}`}>
            {faceCount > 1 ? `${faceCount} faces detected` : faceCount === 1 ? 'Face in frame' : 'No face detected'}
          </span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><ScanFace size={17} className="text-primary" /> Optional camera check</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">Checks whether a face is visible during practice. It does not identify you or affect your interview score.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">{message}</p>
          <div className="mt-3">
            {status === 'active'
              ? <Button type="button" size="sm" variant="outline" onClick={stopCamera}><CameraOff size={15} /> Turn off camera</Button>
              : <Button type="button" size="sm" variant="outline" onClick={startCamera} disabled={status === 'starting'}>
                {status === 'starting' ? <LoaderCircle size={15} className="animate-spin" /> : <Camera size={15} />}
                {status === 'starting' ? 'Starting camera…' : status === 'error' ? 'Try camera again' : 'Enable camera check'}
              </Button>}
          </div>
        </div>
      </div>
    </section>
  )
})

export default FacePresenceMonitor
