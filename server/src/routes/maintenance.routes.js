import { Router } from 'express'
import { getMaintenanceStatus } from '../controllers/adminController.js'
import { asyncHandler } from '../utils/validate.js'

const router = Router()

router.get('/status', asyncHandler(getMaintenanceStatus))

export default router
