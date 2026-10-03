import { Router } from 'express'
import { z } from 'zod'
import { createAdmin, createQuestion, deleteAccount, getAdminDashboard, listAccounts, listQuestions, resetLeaderboard } from '../controllers/adminController.js'
import { auth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { asyncHandler, validate } from '../utils/validate.js'
import { addAdminTicketMessage, closeAdminTicket, getAdminTicket, listAdminTickets } from '../controllers/supportController.js'

const router = Router()
const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Enter a valid email address').max(255),
  password: z.string().min(8, 'Admin passwords must be at least 8 characters').max(128),
})
const createQuestionSchema = z.object({
  mode: z.enum(['Technical', 'HR', 'Both']),
  domain: z.string().trim().min(2).max(100),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  questionText: z.string().trim().min(10).max(600),
  category: z.string().trim().max(80).default(''),
  sampleAnswer: z.string().trim().max(3000).default(''),
  isCompulsory: z.boolean().default(false),
})
const ticketReplySchema = z.object({
  message: z.string().trim().min(1, 'Reply cannot be empty').max(5000),
})

router.use(auth, requireAdmin)
router.get('/dashboard', asyncHandler(getAdminDashboard))
router.post('/leaderboard/reset', asyncHandler(resetLeaderboard))
router.get('/support/tickets', asyncHandler(listAdminTickets))
router.get('/support/tickets/:id', asyncHandler(getAdminTicket))
router.post('/support/tickets/:id/messages', validate(ticketReplySchema), asyncHandler(addAdminTicketMessage))
router.post('/support/tickets/:id/close', asyncHandler(closeAdminTicket))
router.get('/accounts', asyncHandler(listAccounts))
router.delete('/accounts/:id', asyncHandler(deleteAccount))
router.get('/questions', asyncHandler(listQuestions))
router.post('/questions', validate(createQuestionSchema), asyncHandler(createQuestion))
router.post('/admins', validate(createAdminSchema), asyncHandler(createAdmin))

export default router
