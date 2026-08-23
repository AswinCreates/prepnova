import { Router } from 'express'
import { getQuestionPool } from '../controllers/questionController.js'
import { auth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/validate.js'

const router = Router()

router.get('/pool', auth, asyncHandler(getQuestionPool))

export default router