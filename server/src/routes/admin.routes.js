import { Router } from 'express'
import { z } from 'zod'
import { createAdmin, deleteAccount, getAdminDashboard, listAccounts } from '../controllers/adminController.js'
import { auth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { asyncHandler, validate } from '../utils/validate.js'

const router = Router()
const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Enter a valid email address').max(255),
  password: z.string().min(8, 'Admin passwords must be at least 8 characters').max(128),
})

router.use(auth, requireAdmin)
router.get('/dashboard', asyncHandler(getAdminDashboard))
router.get('/accounts', asyncHandler(listAccounts))
router.delete('/accounts/:id', asyncHandler(deleteAccount))
router.post('/admins', validate(createAdminSchema), asyncHandler(createAdmin))

export default router
