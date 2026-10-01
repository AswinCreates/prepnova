import { pool } from '../config/db.js'
import { ApiError } from './errorHandler.js'

export function requireAdmin(req, _res, next) {
  pool
    .query('SELECT role FROM users WHERE id = $1', [req.userId])
    .then(({ rows: [user] }) => {
      if (!user || user.role !== 'admin') return next(new ApiError(403, 'Admin access is required'))
      req.userRole = user.role
      return next()
    })
    .catch(next)
}
