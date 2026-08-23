import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'prepnova',
  max: 10,
  idleTimeoutMillis: 30000,
})

/**
 * Simple health check used at server startup. Does NOT crash the server if the
 * database is unreachable — the API can still boot (endpoints will surface
 * connection errors to the client).
 */
export async function pingDatabase() {
  const res = await pool.query('SELECT NOW() AS now')
  return res.rows[0].now
}

export default pool