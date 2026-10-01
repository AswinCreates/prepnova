import { pool } from '../config/db.js'
import { sanitizeUser } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'

const USER_COLUMNS = `id, name, email, preferred_domain, target_skills, headline,
  experience_level, location, target_role, bio, linkedin_url, portfolio_url,
  role, login_count, last_login_at, created_at`

export async function getProfile(req, res) {
  const {
    rows: [row],
  } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [req.userId])
  if (!row) throw new ApiError(404, 'User not found')
  res.json({ user: sanitizeUser(row) })
}

export async function updateProfile(req, res) {
  const {
    rows: [existing],
  } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [req.userId])
  if (!existing) throw new ApiError(404, 'User not found')

  const next = (key, column, nullable = true) => {
    if (!Object.hasOwn(req.body, key)) return existing[column]
    const value = req.body[key]
    return nullable && value === '' ? null : value
  }
  const name = req.body.name ?? existing.name
  const preferredDomain = next('preferredDomain', 'preferred_domain')
  const targetSkills = next('targetSkills', 'target_skills', false) ?? []
  const headline = next('headline', 'headline')
  const experienceLevel = next('experienceLevel', 'experience_level')
  const location = next('location', 'location')
  const targetRole = next('targetRole', 'target_role')
  const bio = next('bio', 'bio')
  const linkedinUrl = next('linkedinUrl', 'linkedin_url')
  const portfolioUrl = next('portfolioUrl', 'portfolio_url')

  const {
    rows: [row],
  } = await pool.query(
    `UPDATE users
     SET name = $1, preferred_domain = $2, target_skills = $3,
         headline = $4, experience_level = $5, location = $6, target_role = $7,
         bio = $8, linkedin_url = $9, portfolio_url = $10, updated_at = now()
     WHERE id = $11
     RETURNING ${USER_COLUMNS}`,
    [name, preferredDomain, targetSkills, headline, experienceLevel, location, targetRole, bio, linkedinUrl, portfolioUrl, req.userId]
  )
  res.json({ user: sanitizeUser(row) })
}
