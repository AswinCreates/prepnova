import { Router } from 'express'
import { z } from 'zod'
import { addUserTicketMessage, createTicket, getUserTicket, listUserTickets } from '../controllers/supportController.js'
import { auth } from '../middleware/auth.js'
import { asyncHandler, validate } from '../utils/validate.js'

const router = Router()
const ticketSchema = z.object({
  subject: z.string().trim().min(4, 'Subject must be at least 4 characters').max(160),
  category: z.enum(['Question', 'Technical issue', 'Account', 'Feedback', 'Complaint', 'Other']),
  message: z.string().trim().min(10, 'Please provide at least 10 characters').max(5000),
})
const messageSchema = z.object({
  message: z.string().trim().min(1, 'Reply cannot be empty').max(5000),
})

router.use(auth)
router.get('/tickets', asyncHandler(listUserTickets))
router.post('/tickets', validate(ticketSchema), asyncHandler(createTicket))
router.get('/tickets/:id', asyncHandler(getUserTicket))
router.post('/tickets/:id/messages', validate(messageSchema), asyncHandler(addUserTicketMessage))

export default router
