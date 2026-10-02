import { Router } from 'express'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notificationController.js'
import { auth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/validate.js'

const router = Router()
router.use(auth)

router.get('/', asyncHandler(listNotifications))
router.post('/read-all', asyncHandler(markAllNotificationsRead))
router.post('/:id/read', asyncHandler(markNotificationRead))

export default router
