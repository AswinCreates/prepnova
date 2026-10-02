import { Router } from 'express'
import { dashboardStats, leaderboard } from '../controllers/dashboardController.js'
import { auth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/validate.js'

const router = Router()

router.get('/stats', auth, asyncHandler(dashboardStats))
router.get('/leaderboard', auth, asyncHandler(leaderboard))

export default router
