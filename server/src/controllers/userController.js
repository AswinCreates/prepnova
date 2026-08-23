import { pool } from '../config/db.js'
import { sanitizeUser } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'

const USER_COLUMNS = `id, name, email, preferred_domain, target_skills, created_at`

export async function getProfile(req, res) {
  const {
    rows: [row],
  } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [req.userId])
  if (!row) throw new ApiError(404, 'User not found')
  res.json({ user: sanitizeUser(row) })
}

export async function updateProfile(req, res) {
  const { name, preferredDomain, targetSkills } = req.body

  // Keep existing values when fields are omitted (e.g. updating only domain).
  const {
    rows: [existing],
  } = await pool.query(`SELECT name FROM users WHERE id = $1`, [req.userId])
  if (!existing) throw new ApiError(404, 'User not found')

  const {
    rows: [row],
  } = await pool.query(
    `UPDATE users
     SET name = $1, preferred_domain = $2, target_skills = $3, updated_at = now()
     WHERE id = $4
     RETURNING ${USER_COLUMNS}`,
    [name ?? existing.name, preferredDomain ?? null, targetSkills ?? [], req.userId]
  )
  res.json({ user: sanitizeUser(row) })
}