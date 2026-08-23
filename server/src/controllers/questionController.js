import { pool } from '../config/db.js'

/** Pool of questions, optionally filtered by mode / domain / difficulty. */
export async function getQuestionPool(req, res) {
  const { mode, domain, difficulty } = req.query
  const conditions = []
  const params = []
  if (mode) {
    params.push(mode)
    conditions.push(`mode = $${params.length}`)
  }
  if (domain) {
    params.push(domain)
    conditions.push(`domain = $${params.length}`)
  }
  if (difficulty) {
    params.push(difficulty)
    conditions.push(`difficulty = $${params.length}`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const { rows } = await pool.query(
    `SELECT id, mode, domain, difficulty, question_text, category
     FROM questions ${where} ORDER BY id`
  , params)
  res.json({ questions: rows })
}