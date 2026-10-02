import { pool } from '../config/db.js'
import { ApiError } from '../middleware/errorHandler.js'

export async function listNotifications(req, res) {
  const [notifications, unread] = await Promise.all([
    pool.query(
      `SELECT id, type, title, message, link, created_at, read_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 30`,
      [req.userId]
    ),
    pool.query(
      'SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [req.userId]
    ),
  ])

  res.json({ notifications: notifications.rows, unreadCount: unread.rows[0].total })
}

export async function markNotificationRead(req, res) {
  const notificationId = Number(req.params.id)
  if (!Number.isSafeInteger(notificationId) || notificationId < 1) {
    throw new ApiError(400, 'Invalid notification ID')
  }

  const { rows: [notification] } = await pool.query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, now())
     WHERE id = $1 AND user_id = $2
     RETURNING id, read_at`,
    [notificationId, req.userId]
  )
  if (!notification) throw new ApiError(404, 'Notification not found')

  res.json({ notification })
}

export async function markAllNotificationsRead(req, res) {
  const { rowCount } = await pool.query(
    'UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL',
    [req.userId]
  )
  res.json({ markedRead: rowCount })
}
