import { Router } from 'express'
import { z } from 'zod'
import { getProfile, updateProfile } from '../controllers/userController.js'
import { auth } from '../middleware/auth.js'
import { asyncHandler, validate } from '../utils/validate.js'

const router = Router()

const updateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  preferredDomain: z.string().max(120).nullable().optional(),
  targetSkills: z.array(z.string()).optional(),
})

router.use(auth)
router.get('/profile', asyncHandler(getProfile))
router.put('/profile', validate(updateSchema), asyncHandler(updateProfile))

export default router