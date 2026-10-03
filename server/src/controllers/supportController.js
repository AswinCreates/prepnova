import { pool } from '../config/db.js'
import { ApiError } from '../middleware/errorHandler.js'

function parseTicketId(raw) {
  const id = Number(raw)
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, 'Invalid ticket ID')
  return id
}

async function getTicketDetail(ticketId, ownerId = null) {
  const ownerClause = ownerId === null ? '' : 'AND t.user_id = $2'
  const params = ownerId === null ? [ticketId] : [ticketId, ownerId]
  const { rows: [ticket] } = await pool.query(
    `SELECT t.id, t.user_id, t.subject, t.category, t.status, t.created_at,
            t.updated_at, t.closed_at, u.name AS requester_name, u.email AS requester_email
     FROM support_tickets t
     JOIN users u ON u.id = t.user_id
     WHERE t.id = $1 ${ownerClause}`,
    params
  )
  if (!ticket) throw new ApiError(404, 'Ticket not found')

  const { rows: messages } = await pool.query(
    `SELECT m.id, m.sender_id, m.sender_role, m.message, m.created_at,
            COALESCE(u.name, 'Former account') AS sender_name
     FROM support_ticket_messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.ticket_id = $1
     ORDER BY m.created_at ASC, m.id ASC`,
    [ticketId]
  )
  return { ...ticket, messages }
}

export async function listUserTickets(req, res) {
  const { rows } = await pool.query(
    `SELECT t.id, t.subject, t.category, t.status, t.created_at, t.updated_at,
            (SELECT m.message FROM support_ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message,
            (SELECT m.sender_role FROM support_ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_sender_role
     FROM support_tickets t
     WHERE t.user_id = $1
     ORDER BY t.updated_at DESC, t.id DESC`,
    [req.userId]
  )
  res.json({ tickets: rows })
}

export async function getUserTicket(req, res) {
  res.json({ ticket: await getTicketDetail(parseTicketId(req.params.id), req.userId) })
}

export async function createTicket(req, res) {
  const { subject, category, message } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [ticket] } = await client.query(
      `INSERT INTO support_tickets (user_id, subject, category)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, subject, category, status, created_at, updated_at, closed_at`,
      [req.userId, subject.trim(), category]
    )
    await client.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_id, sender_role, message)
       VALUES ($1, $2, 'user', $3)`,
      [ticket.id, req.userId, message.trim()]
    )
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link, dedupe_key)
       SELECT id, 'support_ticket', 'New support ticket', $1, '/admin?section=tickets', $2
       FROM users WHERE role = 'admin'
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [`A user submitted “${ticket.subject}” under ${ticket.category}.`, `ticket-opened:${ticket.id}`]
    )
    await client.query('COMMIT')
    res.status(201).json({ ticket: { ...ticket, messages: [] } })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function addUserTicketMessage(req, res) {
  const ticketId = parseTicketId(req.params.id)
  const message = req.body.message.trim()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [ticket] } = await client.query(
      'SELECT id, subject, status FROM support_tickets WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [ticketId, req.userId]
    )
    if (!ticket) throw new ApiError(404, 'Ticket not found')
    if (ticket.status === 'closed') throw new ApiError(409, 'This ticket is closed. Create a new ticket if you need more help.')
    const { rows: [created] } = await client.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_id, sender_role, message)
       VALUES ($1, $2, 'user', $3)
       RETURNING id, sender_id, sender_role, message, created_at`,
      [ticketId, req.userId, message]
    )
    await client.query('UPDATE support_tickets SET updated_at = now() WHERE id = $1', [ticketId])
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link, dedupe_key)
       SELECT id, 'support_ticket_reply', 'User replied to a support ticket', $1, '/admin?section=tickets', $2
       FROM users WHERE role = 'admin'
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [`A user replied to ticket #${ticketId}: “${ticket.subject}”.`, `ticket-user-reply:${created.id}`]
    )
    await client.query('COMMIT')
    res.status(201).json({ message: { ...created, sender_name: req.userName || 'You' } })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function listAdminTickets(req, res) {
  const { status } = req.query
  const validStatuses = ['open', 'in_progress', 'closed']
  if (status && !validStatuses.includes(status)) throw new ApiError(400, 'Invalid ticket status')
  const params = status ? [status] : []
  const filter = status ? 'WHERE t.status = $1' : ''
  const { rows } = await pool.query(
    `SELECT t.id, t.user_id, t.subject, t.category, t.status, t.created_at, t.updated_at,
            u.name AS requester_name, u.email AS requester_email,
            (SELECT m.message FROM support_ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message,
            (SELECT m.sender_role FROM support_ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_sender_role,
            (SELECT COUNT(*)::int FROM support_ticket_messages m WHERE m.ticket_id = t.id) AS message_count
     FROM support_tickets t JOIN users u ON u.id = t.user_id
     ${filter}
     ORDER BY CASE t.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
              t.updated_at DESC, t.id DESC
     LIMIT 200`,
    params
  )
  res.json({ tickets: rows })
}

export async function getAdminTicket(req, res) {
  res.json({ ticket: await getTicketDetail(parseTicketId(req.params.id)) })
}

export async function addAdminTicketMessage(req, res) {
  const ticketId = parseTicketId(req.params.id)
  const message = req.body.message.trim()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [ticket] } = await client.query(
      'SELECT id, user_id, subject, status FROM support_tickets WHERE id = $1 FOR UPDATE',
      [ticketId]
    )
    if (!ticket) throw new ApiError(404, 'Ticket not found')
    if (ticket.status === 'closed') throw new ApiError(409, 'This ticket is closed and can no longer receive replies')
    const { rows: [created] } = await client.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_id, sender_role, message)
       VALUES ($1, $2, 'admin', $3)
       RETURNING id, sender_id, sender_role, message, created_at`,
      [ticketId, req.userId, message]
    )
    await client.query(
      `UPDATE support_tickets SET status = 'in_progress', updated_at = now() WHERE id = $1`,
      [ticketId]
    )
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link, dedupe_key)
       VALUES ($1, 'support_reply', 'Support replied to your ticket', $2, $3, $4)
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [ticket.user_id, `An administrator replied to “${ticket.subject}”.`, `/support/${ticketId}`, `ticket-reply:${created.id}`]
    )
    await client.query('COMMIT')
    res.status(201).json({ message: { ...created, sender_name: req.adminName || 'PrepNova support' } })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function closeAdminTicket(req, res) {
  const ticketId = parseTicketId(req.params.id)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [ticket] } = await client.query(
      'SELECT id, user_id, subject, status FROM support_tickets WHERE id = $1 FOR UPDATE',
      [ticketId]
    )
    if (!ticket) throw new ApiError(404, 'Ticket not found')
    if (ticket.status === 'closed') throw new ApiError(409, 'This ticket is already closed')
    const { rows: [closed] } = await client.query(
      `UPDATE support_tickets
       SET status = 'closed', closed_at = now(), closed_by = $2, updated_at = now()
       WHERE id = $1
       RETURNING id, status, closed_at`,
      [ticketId, req.userId]
    )
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link, dedupe_key)
       VALUES ($1, 'support_closed', 'Support ticket closed', $2, $3, $4)
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [ticket.user_id, `Your ticket “${ticket.subject}” has been closed by an administrator.`, `/support/${ticketId}`, `ticket-closed:${ticketId}`]
    )
    await client.query('COMMIT')
    res.json({ ticket: closed })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
