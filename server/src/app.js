import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import questionRoutes from './routes/question.routes.js'
import interviewRoutes from './routes/interview.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import adminRoutes from './routes/admin.routes.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'prepnova-api', time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/admin', adminRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
