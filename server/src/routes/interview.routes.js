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
import { transcribeAudio } from '../services/audioTranscriptionService.js'
import pool from '../config/db.js'

const router = Router()
router.use(auth)

const createSchema = z.object({
  mode: z.enum(['Technical', 'HR']),
  domain: z.string().min(1, 'Domain is required'),
  difficulty: z.string().min(1, 'Difficulty is required'),
  questionCount: z.number().int().min(5).max(20).default(5),
  targetRole: z.string().trim().max(160).optional(),
  jobDescription: z.string().trim().max(8000).optional(),
})

const answersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.number().int(),
      answerText: z.string().max(20000).default(''),
      answerMode: z.enum(['typed', 'voice']).default('typed'),
      timeTakenSeconds: z.number().int().nonnegative().optional(),
    })
  ),
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
  const text = await transcribeAudio(audio, normalizedMimeType, rows[0]?.name || '')
  res.json({ transcript: text })
}))

router.post('/', validate(createSchema), asyncHandler(createInterview))
router.post('/:id/tab-switch', validate(tabSwitchSchema), asyncHandler(recordTabSwitch))
router.get('/:id', asyncHandler(getInterviewById))
router.post('/:id/answers', validate(answersSchema), asyncHandler(saveAnswers))
router.post('/:id/complete', asyncHandler(completeInterview))
router.get('/:id/results', asyncHandler(interviewResults))
router.post('/:id/retry', asyncHandler(retryWeakQuestions))

export default router
