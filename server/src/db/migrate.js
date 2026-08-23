import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from '../config/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  // pg executes multiple statements in a single simple query.
  await pool.query(schema)
  console.log('✅ Schema applied successfully.')
}

migrate()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())