import jwt from 'jsonwebtoken'
import { ApiError } from './errorHandler.js'

const SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me'

/** Attach `req.userId` for any request presenting a valid Bearer token. */
export function auth(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return next(new ApiError(401, 'Not authenticated'))

  try {
    const payload = jwt.verify(token, SECRET)
    req.userId = payload.id
    return next()
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'))
  }
}

export function signToken(userId) {
  return jwt.sign({ id: userId }, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

export function sanitizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || 'user',
    preferredDomain: row.preferred_domain,
    targetSkills: row.target_skills || [],
    headline: row.headline || '',
    experienceLevel: row.experience_level || '',
    location: row.location || '',
    targetRole: row.target_role || '',
    bio: row.bio || '',
    linkedinUrl: row.linkedin_url || '',
    portfolioUrl: row.portfolio_url || '',
    loginCount: Number(row.login_count || 0),
    lastLoginAt: row.last_login_at || null,
    createdAt: row.created_at,
  }
}
