import { Router } from 'express'
import { z } from 'zod'
import {
  createInterview,
  getInterviewById,
  saveAnswers,
  completeInterview,
  interviewHistory,
  interviewResults,
  retryWeakQuestions,
  recordTabSwitch,
} from '../controllers/interviewController.js'
import { auth } from '../middleware/auth.js'
import { asyncHandler, validate } from '../utils/validate.js'
import { analyzeAudioDelivery, transcribeAudio } from '../services/audioTranscriptionService.js'
import { ApiError } from '../middleware/errorHandler.js'
import pool from '../config/db.js'

const router = Router()
router.use(auth)

router.param('id', (req, _res, next, routeId) => {
  const resolveInterview = async () => {
    const isLegacyNumericId = /^\d+$/.test(routeId)
    const query = isLegacyNumericId
      ? 'SELECT id, public_id FROM interviews WHERE id = $1 AND user_id = $2'
      : 'SELECT id, public_id FROM interviews WHERE public_id = $1 AND user_id = $2'
    const { rows: [interview] } = await pool.query(query, [routeId, req.userId])
    if (!interview) throw ApiError(404, 'Interview not found')
    req.publicInterviewId = interview.public_id
    req.params.id = String(interview.id)
  }
  resolveInterview().then(() => next()).catch(next)
})

const createSchema = z.object({
  mode: z.enum(['Technical', 'HR']),
  domain: z.string().min(1, 'Domain is required'),
  difficulty: z.string().min(1, 'Difficulty is required'),
  questionCount: z.number().int().min(5).max(20).default(5),
  targetRole: z.string().trim().max(160).optional(),
  jobDescription: z.string().trim().max(8000).optional(),
})

const voiceAnalysisSchema = z.object({
  perceivedTone: z.enum(['calm', 'confident', 'nervous', 'uncertain', 'energetic', 'neutral', 'mixed']),
  confidence: z.enum(['low', 'medium', 'high']),
  cues: z.array(z.string().max(180)).max(3),
  feedback: z.string().max(500),
  disclaimer: z.string().max(250),
}).strict()

const voiceAnalysisRequestSchema = z.object({
  questionId: z.number().int(),
  audio: z.string().min(1).max(19_000_000),
  mimeType: z.string(),
})

const answersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.number().int(),
      answerText: z.string().max(20000).default(''),
      answerMode: z.enum(['typed', 'voice']).default('typed'),
      timeTakenSeconds: z.number().int().nonnegative().optional(),
      voiceAnalysis: voiceAnalysisSchema.nullable().optional(),
    })
  ),
  cameraPresence: z.object({
    faceVisiblePercent: z.number().int().min(0).max(100),
    noFaceEvents: z.number().int().nonnegative().max(10000),
    sampleCount: z.number().int().positive().max(100000),
    durationSeconds: z.number().int().nonnegative().max(36000),
  }).strict().nullable().optional(),
})

const tabSwitchSchema = z.object({
  questionId: z.number().int().optional(),
  answerText: z.string().max(20000).default(''),
  answerMode: z.enum(['typed', 'voice']).default('typed'),
  timeTakenSeconds: z.number().int().nonnegative().default(0),
})

// History must be declared BEFORE the :id route so Express matches it.
router.get('/history', asyncHandler(interviewHistory))

router.post('/transcribe', asyncHandler(async (req, res) => {
  const { audio, mimeType } = req.body || {}
  if (typeof audio !== 'string' || !audio || audio.length > 19_000_000) {
    return res.status(400).json({ message: 'Audio recording is missing or too large. Please record a shorter answer.' })
  }
  const normalizedMimeType = typeof mimeType === 'string' ? mimeType.split(';')[0].trim().toLowerCase() : ''
  if (!['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav'].includes(normalizedMimeType)) {
    return res.status(400).json({ message: 'This audio format is not supported. Please use Chrome or Edge.' })
  }
  const { rows } = await pool.query('SELECT name FROM users WHERE id = $1', [req.userId])
  const transcript = await transcribeAudio(audio, normalizedMimeType, rows[0]?.name || '')
  res.json({ transcript })
}))

router.post('/:id/voice-analysis', validate(voiceAnalysisRequestSchema), asyncHandler(async (req, res) => {
  const interviewId = Number(req.params.id)
  const { questionId, audio, mimeType } = req.body
  const normalizedMimeType = mimeType.split(';')[0].trim().toLowerCase()
  if (!['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav'].includes(normalizedMimeType)) {
    throw ApiError(400, 'This audio format is not supported. Please use Chrome or Edge.')
  }

  const { rows: [session] } = await pool.query(
    `SELECT i.id FROM interviews i
     JOIN answers a ON a.interview_id = i.id
     WHERE i.id = $1 AND i.user_id = $2 AND i.status = 'in_progress' AND a.question_id = $3`,
    [interviewId, req.userId, questionId]
  )
  if (!session) throw ApiError(404, 'Active interview question not found')

  const deliveryAnalysis = await analyzeAudioDelivery(audio, normalizedMimeType)
  res.json({ deliveryAnalysis })
}))

router.post('/', validate(createSchema), asyncHandler(createInterview))
router.post('/:id/tab-switch', validate(tabSwitchSchema), asyncHandler(recordTabSwitch))
router.get('/:id', asyncHandler(getInterviewById))
router.post('/:id/answers', validate(answersSchema), asyncHandler(saveAnswers))
router.post('/:id/complete', validate(answersSchema), asyncHandler(completeInterview))
router.get('/:id/results', asyncHandler(interviewResults))
router.post('/:id/retry', asyncHandler(retryWeakQuestions))

export default router
