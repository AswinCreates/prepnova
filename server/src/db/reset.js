/**
 * PrepNova - DB reset
 * Drops all PrepNova tables and re-applies the schema (keeps the database
 * itself). Use with care in local/dev only.
 * Run via: npm run db:reset
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from '../config/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function reset() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DROP TABLE IF EXISTS notifications, evaluations, answers, questions, interviews, leaderboard_control, users CASCADE')
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
    await client.query(schema)
    await client.query('COMMIT')
    console.log('✅ Database reset and schema reapplied.')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

reset()
  .catch((err) => {
    console.error('❌ Reset failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
