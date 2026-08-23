import 'dotenv/config'
import app from './app.js'
import { pingDatabase } from './config/db.js'

const PORT = Number(process.env.PORT) || 5000

const server = app.listen(PORT, async () => {
  console.log(`🚀 PrepNova API listening on http://localhost:${PORT}`)
  try {
    await pingDatabase()
    console.log('🗄️  Database connection OK')
  } catch (err) {
    console.warn(`⚠️  Database unreachable: ${err.message}`)
    console.warn('   Start PostgreSQL and run `npm run db:migrate && npm run db:seed` in server/.')
  }
})

function shutdown() {
  console.log('\nShutting down...')
  server.close(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)