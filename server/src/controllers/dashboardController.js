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

/** Rank each candidate by their highest interview score, using elapsed time as a tie-breaker. */
export async function leaderboard(req, res) {
  const result = await pool.query(
    `WITH attempts AS (
       SELECT i.id AS interview_id,
              i.user_id,
              u.name,
              u.headline,
              i.total_score AS score,
              COALESCE(SUM(a.time_taken_seconds), 0)::int AS elapsed_seconds,
              i.completed_at,
              i.domain,
              i.difficulty,
              i.mode,
              COUNT(a.id)::int AS question_count
       FROM interviews i
       JOIN users u ON u.id = i.user_id AND u.role = 'user'
       LEFT JOIN answers a ON a.interview_id = i.id
       WHERE i.status = 'completed' AND i.total_score IS NOT NULL
         AND i.completed_at > COALESCE(
           (SELECT reset_at FROM leaderboard_control WHERE id = 1),
           '-infinity'::timestamptz
         )
       GROUP BY i.id, u.id
     ), best_attempts AS (
       SELECT DISTINCT ON (user_id) *
       FROM attempts
       ORDER BY user_id, score DESC, elapsed_seconds ASC, completed_at ASC, interview_id ASC
     ), ranked AS (
       SELECT ROW_NUMBER() OVER (
                ORDER BY score DESC, elapsed_seconds ASC, completed_at ASC, user_id ASC
              )::int AS rank,
              COUNT(*) OVER()::int AS participant_count,
              *
       FROM best_attempts
     )
     SELECT *
     FROM ranked
     WHERE rank <= 50 OR user_id = $1
     ORDER BY rank`,
    [req.userId]
  )

  const rows = result.rows
  const ownEntry = rows.find((row) => row.user_id === req.userId)
  res.json({
    leaderboard: rows.filter((row) => row.rank <= 50),
    participantCount: rows[0]?.participant_count ?? 0,
    currentUserRank: ownEntry?.rank ?? null,
    currentUserEntry: ownEntry ?? null,
  })
}
