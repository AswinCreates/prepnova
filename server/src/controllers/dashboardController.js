import { pool } from '../config/db.js'

/** Aggregate dashboard stats derived from the current user's completed interviews. */
export async function dashboardStats(req, res) {
  const userId = req.userId

  // Summary aggregates.
  const summary = await pool.query(
    `SELECT COUNT(*)::int                          AS total_sessions,
            COALESCE(ROUND(AVG(total_score)),0)::int AS avg_score,
            COALESCE(MAX(total_score),0)::int         AS best_score
     FROM interviews
     WHERE user_id = $1 AND status = 'completed'`,
    [userId]
  )
  const s = summary.rows[0]

  // Domain distribution.
  const domains = await pool.query(
    `SELECT domain, COUNT(*)::int AS count
     FROM interviews
     WHERE user_id = $1 AND status = 'completed'
     GROUP BY domain
     ORDER BY count DESC`,
    [userId]
  )

  // Score timeline for the Recharts line chart (last 10 completed).
  const timeline = await pool.query(
    `SELECT id, total_score AS score, completed_at AS date, domain, difficulty
     FROM interviews
     WHERE user_id = $1 AND status = 'completed'
     ORDER BY completed_at ASC
     LIMIT 10`,
    [userId]
  )

  res.json({
    stats: {
      totalSessions: s.total_sessions,
      avgScore: s.avg_score,
      bestScore: s.best_score,
    },
    domainDistribution: domains.rows,
    timeline: timeline.rows,
  })
}