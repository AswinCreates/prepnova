import { Router } from 'express'
import { z } from 'zod'
import { register, login, logout, me, updateRememberPreference } from '../controllers/authController.js'
import { auth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/validate.js'
import { validate } from '../utils/validate.js'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false),
})

const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
})
const rememberPreferenceSchema = z.object({ rememberMe: z.boolean() })

router.post('/register', validate(registerSchema), asyncHandler(register))
router.post('/login', validate(loginSchema), asyncHandler(login))
router.post('/logout', logout)
router.post('/remember-me', auth, validate(rememberPreferenceSchema), asyncHandler(updateRememberPreference))
router.get('/me', auth, asyncHandler(me))

export default router
