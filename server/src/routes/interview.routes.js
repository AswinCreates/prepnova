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
} from '../controllers/interviewController.js'
import { auth } from '../middleware/auth.js'
import { asyncHandler, validate } from '../utils/validate.js'

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

// History must be declared BEFORE the :id route so Express matches it.
router.get('/history', asyncHandler(interviewHistory))

router.post('/', validate(createSchema), asyncHandler(createInterview))
router.get('/:id', asyncHandler(getInterviewById))
router.post('/:id/answers', validate(answersSchema), asyncHandler(saveAnswers))
router.post('/:id/complete', asyncHandler(completeInterview))
router.get('/:id/results', asyncHandler(interviewResults))
router.post('/:id/retry', asyncHandler(retryWeakQuestions))

export default router
