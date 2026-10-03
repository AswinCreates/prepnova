import { Router } from 'express'
import { z } from 'zod'
import { getProfile, updateProfile } from '../controllers/userController.js'
import { auth } from '../middleware/auth.js'
import { asyncHandler, validate } from '../utils/validate.js'

const router = Router()

const updateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  preferredDomain: z.string().max(120).nullable().optional(),
  targetSkills: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  headline: z.string().trim().max(160).nullable().optional(),
  experienceLevel: z.enum(['Student', 'Entry level', 'Mid-level', 'Senior']).or(z.literal('')).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().max(120).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
  targetRole: z.string().trim().max(160).nullable().optional(),
  bio: z.string().trim().max(1200).nullable().optional(),
  linkedinUrl: z.string().trim().max(300).refine((value) => !value || /^https?:\/\//i.test(value), 'Use a valid http or https URL').nullable().optional(),
  portfolioUrl: z.string().trim().max(300).refine((value) => !value || /^https?:\/\//i.test(value), 'Use a valid http or https URL').nullable().optional(),
})

router.use(auth)
router.get('/profile', asyncHandler(getProfile))
router.put('/profile', validate(updateSchema), asyncHandler(updateProfile))

export default router
