import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { sanitizeUser } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'

export async function getAdminDashboard(_req, res) {
  const [summary, trend, recentUsers, recentLogins] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE role = 'user')::int AS total_users,
         COUNT(*) FILTER (WHERE role = 'admin')::int AS total_admins,
         COUNT(*) FILTER (WHERE role = 'user' AND last_login_at >= now() - interval '30 days')::int AS active_users_30d,
         COUNT(*) FILTER (WHERE role = 'user' AND created_at >= now() - interval '30 days')::int AS new_users_30d
       FROM users`
    ),
    pool.query(
      `WITH days AS (
         SELECT generate_series(current_date - 29, current_date, interval '1 day')::date AS day
       ), accounts AS (
         SELECT created_at::date AS day, COUNT(*)::int AS total
         FROM users
         WHERE role = 'user' AND created_at >= current_date - interval '29 days'
         GROUP BY created_at::date
       ), logins AS (
         SELECT event.logged_in_at::date AS day, COUNT(*)::int AS total
         FROM login_events event
         JOIN users user_row ON user_row.id = event.user_id
         WHERE user_row.role = 'user' AND event.logged_in_at >= current_date - interval '29 days'
         GROUP BY event.logged_in_at::date
       )
       SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
              COALESCE(accounts.total, 0)::int AS new_accounts,
              COALESCE(logins.total, 0)::int AS logins
       FROM days
       LEFT JOIN accounts USING (day)
       LEFT JOIN logins USING (day)
       ORDER BY days.day`
    ),
    pool.query(
      `SELECT id, name, email, role, created_at, last_login_at, login_count
       FROM users
       WHERE role = 'user'
       ORDER BY created_at DESC
       LIMIT 8`
    ),
    pool.query(
      `SELECT event.logged_in_at, user_row.name, user_row.email
       FROM login_events event
       JOIN users user_row ON user_row.id = event.user_id
       WHERE user_row.role = 'user'
       ORDER BY event.logged_in_at DESC
       LIMIT 8`
    ),
  ])

  const [counts] = summary.rows
  const loginCount = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM login_events event
     JOIN users user_row ON user_row.id = event.user_id
     WHERE user_row.role = 'user'`
  )

  res.json({
    stats: {
      totalUsers: counts.total_users,
      totalAdmins: counts.total_admins,
      activeUsers30d: counts.active_users_30d,
      newUsers30d: counts.new_users_30d,
      successfulLogins: loginCount.rows[0].total,
    },
    trend: trend.rows,
    recentUsers: recentUsers.rows,
    recentLogins: recentLogins.rows,
  })
}

export async function listAccounts(_req, res) {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, created_at, last_login_at, login_count
     FROM users
     ORDER BY created_at DESC
     LIMIT 100`
  )
  res.json({ accounts: rows })
}

export async function listQuestions(_req, res) {
  const { rows } = await pool.query(
    `SELECT id, mode, domain, difficulty, question_text, category, is_compulsory
     FROM questions
     ORDER BY is_compulsory DESC, id DESC
     LIMIT 250`
  )
  res.json({ questions: rows })
}

export async function createQuestion(req, res) {
  const {
    mode, domain, difficulty, questionText, category = '',
    sampleAnswer = '', isCompulsory = false,
  } = req.body

  if (isCompulsory) {
    const { rows: [counts] } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM questions WHERE is_compulsory = true'
    )
    if (counts.total >= 20) throw new ApiError(409, 'Interviews can have at most 20 required questions')
  }

  try {
    const { rows: [question] } = await pool.query(
      `INSERT INTO questions
        (mode, domain, difficulty, question_text, category, sample_answer, is_compulsory)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, mode, domain, difficulty, question_text, category, is_compulsory`,
      [isCompulsory ? 'Both' : mode, isCompulsory ? 'General' : domain, difficulty, questionText.trim(), category.trim(), sampleAnswer.trim(), isCompulsory]
    )
    res.status(201).json({ question })
  } catch (err) {
    if (err.code === '23505') throw new ApiError(409, 'That question already exists')
    throw err
  }
}

export async function createAdmin(req, res) {
  const { name, email, password } = req.body
  const normalizedEmail = email.trim().toLowerCase()
  const existing = await pool.query('SELECT id FROM users WHERE lower(email) = $1', [normalizedEmail])
  if (existing.rowCount > 0) throw new ApiError(409, 'An account with this email already exists')

  const passwordHash = await bcrypt.hash(password, 12)
  try {
    const {
      rows: [admin],
    } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, name, email, preferred_domain, target_skills, headline,
                 experience_level, location, target_role, bio, linkedin_url,
                 portfolio_url, role, login_count, last_login_at, created_at`,
      [name.trim(), normalizedEmail, passwordHash]
    )
    res.status(201).json({ admin: sanitizeUser(admin) })
  } catch (err) {
    if (err.code === '23505') throw new ApiError(409, 'An account with this email already exists')
    throw err
  }
}

export async function deleteAccount(req, res) {
  const accountId = Number(req.params.id)
  if (!Number.isSafeInteger(accountId) || accountId < 1) {
    throw new ApiError(400, 'Invalid account ID')
  }
  if (accountId === Number(req.userId)) {
    throw new ApiError(400, 'You cannot delete your own admin account')
  }

  const { rows: [account] } = await pool.query(
    'SELECT id, role FROM users WHERE id = $1',
    [accountId]
  )
  if (!account) throw new ApiError(404, 'Account not found')

  if (account.role === 'admin') {
    const { rows: [adminCount] } = await pool.query(
      "SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin'"
    )
    if (adminCount.total <= 1) {
      throw new ApiError(409, 'The last administrator account cannot be deleted')
    }
  }

  await pool.query('DELETE FROM users WHERE id = $1', [accountId])
  res.json({ message: 'Account deleted successfully', id: accountId })
}
