import { pool } from '../config/db.js'
import { ApiError } from '../middleware/errorHandler.js'

const STORY_COLUMNS = `id, title, story_type, situation, task, action, result, skills, created_at, updated_at`

function parseStoryId(value) {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, 'Invalid story ID')
  return id
}

export async function listStories(req, res) {
  const { rows } = await pool.query(
    `SELECT ${STORY_COLUMNS} FROM answer_stories
     WHERE user_id = $1 ORDER BY updated_at DESC, id DESC`,
    [req.userId]
  )
  res.json({ stories: rows })
}

export async function createStory(req, res) {
  const { title, storyType, situation, task, action, result, skills } = req.body
  const { rows: [story] } = await pool.query(
    `INSERT INTO answer_stories (user_id, title, story_type, situation, task, action, result, skills)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${STORY_COLUMNS}`,
    [req.userId, title, storyType, situation, task, action, result, skills]
  )
  res.status(201).json({ story })
}

export async function updateStory(req, res) {
  const id = parseStoryId(req.params.id)
  const { title, storyType, situation, task, action, result, skills } = req.body
  const { rows: [story] } = await pool.query(
    `UPDATE answer_stories
     SET title = $1, story_type = $2, situation = $3, task = $4,
         action = $5, result = $6, skills = $7, updated_at = now()
     WHERE id = $8 AND user_id = $9
     RETURNING ${STORY_COLUMNS}`,
    [title, storyType, situation, task, action, result, skills, id, req.userId]
  )
  if (!story) throw new ApiError(404, 'Story not found')
  res.json({ story })
}

export async function deleteStory(req, res) {
  const id = parseStoryId(req.params.id)
  const { rowCount } = await pool.query(
    'DELETE FROM answer_stories WHERE id = $1 AND user_id = $2',
    [id, req.userId]
  )
  if (!rowCount) throw new ApiError(404, 'Story not found')
  res.json({ message: 'Story deleted successfully', id })
}
