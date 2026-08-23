import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { signToken, sanitizeUser } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'

export async function register(req, res) {
  const { name, email, password } = req.body

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rowCount > 0) throw new ApiError(409, 'An account with this email already exists')

  const passwordHash = await bcrypt.hash(password, 10)
  const {
    rows: [row],
  } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, preferred_domain, target_skills, created_at`,
    [name, email, passwordHash]
  )

  res.status(201).json({ token: signToken(row.id), user: sanitizeUser(row) })
}

export async function login(req, res) {
  const { email, password } = req.body

  const {
    rows: [row],
  } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  if (!row) throw new ApiError(401, 'Invalid email or password')

  const valid = await bcrypt.compare(password, row.password_hash)
  if (!valid) throw new ApiError(401, 'Invalid email or password')

  res.json({ token: signToken(row.id), user: sanitizeUser(row) })
}

export async function me(req, res) {
  const {
    rows: [row],
  } = await pool.query(
    `SELECT id, name, email, preferred_domain, target_skills, created_at
     FROM users WHERE id = $1`,
    [req.userId]
  )
  if (!row) throw new ApiError(404, 'User not found')
  res.json({ user: sanitizeUser(row) })
}