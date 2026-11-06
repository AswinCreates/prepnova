import { pool } from '../config/db.js'
import { getSessionPayload } from './auth.js'

let cachedSettings = null
let cacheExpiresAt = 0

export function refreshMaintenanceCache(settings) {
  cachedSettings = settings
  cacheExpiresAt = Date.now() + 2000
}

async function readSettings() {
  if (cachedSettings && Date.now() < cacheExpiresAt) return cachedSettings
  const { rows: [settings] } = await pool.query(
    'SELECT maintenance_mode, maintenance_message FROM platform_settings WHERE id = 1'
  )
  cachedSettings = settings || { maintenance_mode: false, maintenance_message: '' }
  cacheExpiresAt = Date.now() + 2000
  return cachedSettings
}

export async function enforceMaintenanceMode(req, res, next) {
  try {
    if (req.path === '/api/health' || req.path === '/api/maintenance/status') return next()
    const settings = await readSettings()
    if (!settings.maintenance_mode) return next()

    // Keep sign-in available so an administrator can enter the console and
    // turn maintenance mode off. Registration and user APIs remain blocked.
    if (['/api/auth/login', '/api/auth/logout', '/api/auth/me'].includes(req.path)) return next()

    const session = getSessionPayload(req)
    if (session?.id) {
      const { rows: [account] } = await pool.query('SELECT role FROM users WHERE id = $1', [session.id])
      if (account?.role === 'admin') return next()
    }

    return res.status(503).json({
      maintenanceMode: true,
      message: settings.maintenance_message || 'We are making a few improvements. PrepNova will be back shortly.',
    })
  } catch (error) {
    return next(error)
  }
}
