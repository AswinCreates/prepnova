import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { signToken, sanitizeUser } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'

export async function register(req, res) {
  const { name, email, password } = req.body
  const passwordHash = await bcrypt.hash(password, 10)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      rows: [row],
    } = await client.query(
      `INSERT INTO users (name, email, password_hash, role, login_count, last_login_at)
       VALUES ($1, $2, $3, 'user', 1, now())
       RETURNING id, name, email, preferred_domain, target_skills,
                 headline, experience_level, location, state, country, target_role, bio,
                 linkedin_url, portfolio_url, role, login_count, last_login_at, created_at`,
      [name, email, passwordHash]
    )
    await client.query('INSERT INTO login_events (user_id) VALUES ($1)', [row.id])
    await client.query('COMMIT')
    res.status(201).json({ token: signToken(row.id), user: sanitizeUser(row) })
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') throw new ApiError(409, 'An account with this email already exists')
    throw err
  } finally {
    client.release()
  }
}

export async function login(req, res) {
  const { email, password } = req.body

  const {
    rows: [row],
  } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  if (!row) throw new ApiError(401, 'Invalid email or password')

  const valid = await bcrypt.compare(password, row.password_hash)
  if (!valid) throw new ApiError(401, 'Invalid email or password')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      rows: [loggedInUser],
    } = await client.query(
      `UPDATE users
       SET login_count = login_count + 1, last_login_at = now()
       WHERE id = $1
       RETURNING id, name, email, preferred_domain, target_skills, headline,
                 experience_level, location, state, country, target_role, bio, linkedin_url,
                 portfolio_url, role, login_count, last_login_at, created_at`,
      [row.id]
    )
    await client.query('INSERT INTO login_events (user_id) VALUES ($1)', [row.id])
    await client.query('COMMIT')
    res.json({ token: signToken(loggedInUser.id), user: sanitizeUser(loggedInUser) })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function me(req, res) {
  const {
    rows: [row],
  } = await pool.query(
    `SELECT id, name, email, preferred_domain, target_skills,
            headline, experience_level, location, state, country, target_role, bio,
            linkedin_url, portfolio_url, role, login_count, last_login_at, created_at
     FROM users WHERE id = $1`,
    [req.userId]
  )
  if (!row) throw new ApiError(404, 'User not found')
  res.json({ user: sanitizeUser(row) })
}
