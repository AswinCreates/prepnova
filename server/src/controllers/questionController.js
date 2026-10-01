import { pool } from '../config/db.js'

/** Pool of questions, optionally filtered by mode / domain / difficulty. */
export async function getQuestionPool(req, res) {
  const { mode, domain, difficulty } = req.query
  const conditions = []
  const params = []
  if (mode) {
    params.push(mode)
    conditions.push(`(mode = $${params.length} OR mode = 'Both' OR is_compulsory = true)`)
  }
  if (domain) {
    params.push(domain)
    conditions.push(`(domain = $${params.length} OR domain = 'General' OR is_compulsory = true)`)
  }
  if (difficulty) {
    params.push(difficulty)
    conditions.push(`(difficulty = $${params.length} OR is_compulsory = true)`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const { rows } = await pool.query(
    `SELECT id, mode, domain, difficulty, question_text, category, is_compulsory
     FROM questions ${where} ORDER BY id`
  , params)
  res.json({ questions: rows, compulsoryCount: rows.filter((question) => question.is_compulsory).length })
}
