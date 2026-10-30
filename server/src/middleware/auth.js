import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { ApiError } from './errorHandler.js'

const SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me'
export const SESSION_COOKIE_NAME = 'prepnova_session'
const COOKIE_SAME_SITE = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase()
const COOKIE_SECURE = process.env.NODE_ENV === 'production' || COOKIE_SAME_SITE === 'none'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function readCookie(req, name) {
  const entry = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))
  if (!entry) return null
  try { return decodeURIComponent(entry.slice(name.length + 1)) } catch { return null }
}

export function setSessionCookie(res, token, rememberMe = false) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    ...(rememberMe ? { maxAge: THIRTY_DAYS_MS } : {}),
  })
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
  })
}

/** Attach `req.userId` from the secure session cookie or a legacy Bearer token. */
export function auth(req, _res, next) {
  const cookieToken = readCookie(req, SESSION_COOKIE_NAME)
  const header = req.headers.authorization || ''
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null
  const token = cookieToken || bearerToken
  if (!token) return next(new ApiError(401, 'Not authenticated'))

  try {
    const payload = jwt.verify(token, SECRET)
    req.userId = payload.id
    req.authSource = cookieToken ? 'cookie' : 'bearer'
    return next()
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'))
  }
}

export function signToken(userId, rememberMe = false) {
  return jwt.sign({ id: userId }, SECRET, {
    jwtid: randomUUID(),
    expiresIn: rememberMe ? '30d' : process.env.JWT_EXPIRES_IN || '7d',
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
    state: row.state || '',
    country: row.country || '',
    targetRole: row.target_role || '',
    bio: row.bio || '',
    linkedinUrl: row.linkedin_url || '',
    portfolioUrl: row.portfolio_url || '',
    loginCount: Number(row.login_count || 0),
    lastLoginAt: row.last_login_at || null,
    createdAt: row.created_at,
  }
}
