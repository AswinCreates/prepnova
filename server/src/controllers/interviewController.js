import { pool } from '../config/db.js'
import { evaluateInterview } from '../services/aiEvaluationService.js'
import { ApiError } from '../middleware/errorHandler.js'

const QUESTIONS_PER_INTERVIEW = 5

function assertOwns(row) {
  if (!row) throw new ApiError(404, 'Interview not found')
}

/** Create an interview, snapshot a question set (via placeholder answers). */
export async function createInterview(req, res) {
  const { mode, domain, difficulty } = req.body

  // Prefer exact mode+domain+difficulty matches, then pad from the same
  // mode+domain (any difficulty) so interviews have a consistent question count.
  const { rows: exact } = await pool.query(
    `SELECT id, question_text, category
     FROM questions
     WHERE mode = $1 AND domain = $2 AND difficulty = $3
     ORDER BY RANDOM()`,
    [mode, domain, difficulty]
  )

  let selected = [...exact]
  if (selected.length < QUESTIONS_PER_INTERVIEW) {
    const ids = selected.length ? selected.map((q) => q.id) : [0]
    const { rows: extra } = await pool.query(
      `SELECT id, question_text, category
       FROM questions
       WHERE mode = $1 AND domain = $2 AND id <> ALL($3::int[])
       ORDER BY RANDOM()
       LIMIT $4`,
      [mode, domain, ids, QUESTIONS_PER_INTERVIEW - selected.length]
    )
    selected = selected.concat(extra)
  }
  selected = selected.slice(0, QUESTIONS_PER_INTERVIEW)

  if (selected.length === 0) {
    throw new ApiError(400, 'No questions match the selected mode, domain, and difficulty')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      rows: [interview],
    } = await client.query(
      `INSERT INTO interviews (user_id, mode, domain, difficulty)
       VALUES ($1, $2, $3, $4)
       RETURNING id, mode, domain, difficulty, status, created_at`,
      [req.userId, mode, domain, difficulty]
    )

    for (const q of selected) {
      await client.query(
        `INSERT INTO answers (interview_id, question_id, user_id, answer_mode, time_taken_seconds)
         VALUES ($1, $2, $3, 'typed', 0)
         ON CONFLICT (interview_id, question_id) DO NOTHING`,
        [interview.id, q.id, req.userId]
      )
    }
    await client.query('COMMIT')

    res.status(201).json({
      interviewId: interview.id,
      mode: interview.mode,
      domain: interview.domain,
      difficulty: interview.difficulty,
      status: interview.status,
      questions: selected.map((q) => ({ id: q.id, question_text: q.question_text, category: q.category })),
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function fetchInterview(userId, interviewId) {
  const {
    rows: [interview],
  } = await pool.query('SELECT * FROM interviews WHERE id = $1 AND user_id = $2', [interviewId, userId])
  assertOwns(interview)

  const { rows: questionRows } = await pool.query(
    `SELECT a.question_id AS id, q.question_text, q.category,
            a.answer_text, a.answer_mode, a.time_taken_seconds
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     WHERE a.interview_id = $1
     ORDER BY a.id`,
    [interviewId]
  )

  return {
    id: interview.id,
    mode: interview.mode,
    domain: interview.domain,
    difficulty: interview.difficulty,
    status: interview.status,
    totalScore: interview.total_score,
    completedAt: interview.completed_at,
    createdAt: interview.created_at,
    questions: questionRows.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      category: q.category,
      answer: q.answer_text
        ? { answer_text: q.answer_text, answer_mode: q.answer_mode, time_taken_seconds: q.time_taken_seconds }
        : null,
    })),
  }
}

export async function getInterviewById(req, res) {
  res.json({ interview: await fetchInterview(req.userId, Number(req.params.id)) })
}

/** Save individual/batch answers for an interview. */
export async function saveAnswers(req, res) {
  const interviewId = Number(req.params.id)
  const { answers } = req.body

  const {
    rows: [interview],
  } = await pool.query('SELECT id FROM interviews WHERE id = $1 AND user_id = $2', [interviewId, req.userId])
  assertOwns(interview)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let saved = 0
    for (const a of answers) {
      const result = await client.query(
        `UPDATE answers
         SET answer_text = $1, answer_mode = $2, time_taken_seconds = $3, updated_at = now()
         WHERE interview_id = $4 AND question_id = $5 AND user_id = $6`,
        [a.answerText ?? '', a.answerMode || 'typed', a.timeTakenSeconds || 0, interviewId, a.questionId, req.userId]
      )
      saved += result.rowCount
    }
    await client.query('COMMIT')
    res.json({ saved })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
/** Finalize an interview: persist answers, run AI evaluation, mark completed. */
export async function completeInterview(req, res) {
  const interviewId = Number(req.params.id)
  const { answers = [] } = req.body || {}

  const {
    rows: [interview],
  } = await pool.query('SELECT * FROM interviews WHERE id = $1 AND user_id = $2', [interviewId, req.userId])
  assertOwns(interview)
  if (interview.status !== 'in_progress') {
    throw new ApiError(409, 'This interview has already been completed')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Save any answers passed with the completion request.
    for (const a of answers) {
      await client.query(
        `UPDATE answers SET answer_text = $1, answer_mode = $2, time_taken_seconds = $3, updated_at = now()
         WHERE interview_id = $4 AND question_id = $5 AND user_id = $6`,
        [a.answerText ?? '', a.answerMode || 'typed', a.timeTakenSeconds || 0, interviewId, a.questionId, req.userId]
      )
    }

    // Collect the answered questions for evaluation.
    const { rows: answeredRows } = await client.query(
      `SELECT a.question_id, a.answer_text, q.question_text
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.interview_id = $1
         AND a.answer_text IS NOT NULL AND length(btrim(a.answer_text)) > 0
       ORDER BY a.id`,
      [interviewId]
    )

    const questions = answeredRows.map((r) => ({ id: r.question_id, question_text: r.question_text }))
    const candidateAnswers = answeredRows.map((r) => ({ question_id: r.question_id, answer_text: r.answer_text }))

    const evaluation = await evaluateInterview({ questions, answers: candidateAnswers })

    await client.query(
      `INSERT INTO evaluations
        (interview_id, overall_score, summary, strengths, weaknesses, improvements, question_evaluations_json, raw_ai_response)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (interview_id) DO UPDATE
         SET overall_score = EXCLUDED.overall_score,
             summary = EXCLUDED.summary,
             strengths = EXCLUDED.strengths,
             weaknesses = EXCLUDED.weaknesses,
             improvements = EXCLUDED.improvements,
             question_evaluations_json = EXCLUDED.question_evaluations_json,
             raw_ai_response = EXCLUDED.raw_ai_response`,
      [
        interviewId,
        evaluation.overallScore,
        evaluation.summary,
        evaluation.strengths,
        evaluation.weaknesses,
        evaluation.improvements,
        JSON.stringify(evaluation.questionEvaluations),
        JSON.stringify(evaluation),
      ]
    )

    await client.query(
      `UPDATE interviews
       SET status = 'completed', total_score = $2, completed_at = now()
       WHERE id = $1`,
      [interviewId, evaluation.overallScore]
    )

    await client.query('COMMIT')
    res.json({ interviewId, ...evaluation })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/** Completed interview list for the current user. */
export async function interviewHistory(req, res) {
  const { rows } = await pool.query(
    `SELECT i.id, i.mode, i.domain, i.difficulty, i.total_score, i.completed_at AS date, i.created_at
     FROM interviews i
     WHERE i.user_id = $1 AND i.status = 'completed'
     ORDER BY i.completed_at DESC`,
    [req.userId]
  )
  res.json({ sessions: rows })
}

/** Detailed evaluation for one completed interview. */
export async function interviewResults(req, res) {
  const interviewId = Number(req.params.id)

  const {
    rows: [interview],
  } = await pool.query('SELECT * FROM interviews WHERE id = $1 AND user_id = $2', [interviewId, req.userId])
  assertOwns(interview)

  const {
    rows: [row],
  } = await pool.query('SELECT * FROM evaluations WHERE interview_id = $1', [interviewId])
  if (!row) throw new ApiError(404, 'This interview has not been evaluated yet')

  // Question texts so the client can render per-question breakdowns.
  const { rows: questionRows } = await pool.query(
    `SELECT a.question_id AS id, q.question_text
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     WHERE a.interview_id = $1
     ORDER BY a.id`,
    [interviewId]
  )

  res.json({
    interview: {
      id: interview.id,
      mode: interview.mode,
      domain: interview.domain,
      difficulty: interview.difficulty,
      status: interview.status,
      totalScore: interview.total_score,
      completedAt: interview.completed_at,
      questions: questionRows,
    },
    evaluation: {
      overallScore: row.overall_score,
      summary: row.summary,
      strengths: row.strengths,
      weaknesses: row.weaknesses,
      improvements: row.improvements,
      questionEvaluations: row.question_evaluations_json,
      source: row.raw_ai_response?.source || null,
      error: row.raw_ai_response?.error || null,
      createdAt: row.created_at,
    },
  })
}