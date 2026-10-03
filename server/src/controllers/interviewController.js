import { pool } from '../config/db.js'
import { evaluateInterview } from '../services/aiEvaluationService.js'
import { ApiError } from '../middleware/errorHandler.js'

const JOB_STOPWORDS = new Set(['about', 'across', 'after', 'and', 'are', 'as', 'for', 'from', 'have', 'into', 'is', 'its', 'our', 'the', 'their', 'this', 'that', 'to', 'with', 'will', 'you', 'your', 'years', 'year', 'work', 'role', 'team', 'skills', 'experience', 'including', 'ability', 'strong', 'good', 'knowledge'])

function words(text) {
  return String(text || '').toLowerCase().match(/[a-z0-9+#.]+/g) || []
}

function rankQuestionsForRole(questions, targetRole, jobDescription, difficulty, domain, limit) {
  const roleTerms = [...new Set(words(targetRole).filter((word) => word.length > 1 && !JOB_STOPWORDS.has(word)))]
  const descriptionTerms = [...new Set(words(jobDescription).filter((word) => word.length > 2 && !JOB_STOPWORDS.has(word)))]
  return [...questions]
    .map((question) => {
      const searchable = new Set(words(`${question.question_text} ${question.category}`))
      const roleMatch = roleTerms.filter((word) => searchable.has(word)).length
      const descriptionMatch = descriptionTerms.filter((word) => searchable.has(word)).length
      return {
        question,
        score: roleMatch * 3 + descriptionMatch + (question.domain === domain ? 2 : 0) + (question.difficulty === difficulty ? 0.5 : 0) + Math.random() * 0.1,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ question }) => question)
}

function assertOwns(row) {
  if (!row) throw new ApiError(404, 'Interview not found')
}

/** Create an interview, snapshot a question set (via placeholder answers). */
export async function createInterview(req, res) {
  const {
    mode, domain, difficulty, targetRole = null, jobDescription = null,
    questionCount = 5,
  } = req.body

  const { rows: compulsoryQuestions } = await pool.query(
    `SELECT id, question_text, category, difficulty, domain, question_type, options
     FROM questions WHERE is_compulsory = true ORDER BY id`
  )
  if (compulsoryQuestions.length > questionCount) {
    throw new ApiError(400, `This interview has ${compulsoryQuestions.length} required questions. Choose at least that many.`)
  }

  const optionalCount = questionCount - compulsoryQuestions.length
  const { rows: candidates } = await pool.query(
    `SELECT id, question_text, category, difficulty, domain, question_type, options
     FROM questions
     WHERE is_compulsory = false AND mode IN ($1, 'Both')
     ORDER BY (domain = $2) DESC, RANDOM()`,
    [mode, domain]
  )
  const optionalQuestions = rankQuestionsForRole(
    candidates, targetRole, jobDescription, difficulty, domain, optionalCount
  )
  if (optionalQuestions.length < optionalCount) {
    const available = compulsoryQuestions.length + optionalQuestions.length
    throw new ApiError(400, `Only ${available} questions are available for this interview type. Ask an admin to add more questions.`)
  }
  const selected = [...compulsoryQuestions, ...optionalQuestions]

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      rows: [interview],
    } = await client.query(
      `INSERT INTO interviews (user_id, mode, domain, difficulty, target_role, job_description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, mode, domain, difficulty, target_role, job_description, status, created_at`,
      [req.userId, mode, domain, difficulty, targetRole, jobDescription]
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
      targetRole: interview.target_role,
      questionCount: selected.length,
      status: interview.status,
      questions: selected.map((q) => ({ id: q.id, question_text: q.question_text, category: q.category, question_type: q.question_type, options: q.options })),
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
    `SELECT a.question_id AS id, q.question_text, q.category, q.question_type, q.options,
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
    targetRole: interview.target_role,
    jobDescription: interview.job_description,
    status: interview.status,
    totalScore: interview.total_score,
    completedAt: interview.completed_at,
    createdAt: interview.created_at,
    questions: questionRows.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      category: q.category,
      question_type: q.question_type,
      options: q.options,
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

    // Evaluate the full interview, including skipped questions. Skips receive 0.
    const { rows: questionRows } = await client.query(
      `SELECT a.question_id AS id, a.answer_text, q.question_text, q.sample_answer,
              q.question_type, q.options, q.correct_option_index
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.interview_id = $1
       ORDER BY a.id`,
      [interviewId]
    )

    const questions = questionRows.map((row) => ({
      id: row.id,
      question_text: row.question_text,
      sample_answer: row.sample_answer,
    }))
    const candidateAnswers = questionRows.map((row) => ({
      question_id: row.id,
      answer_text: row.answer_text || '',
    }))

    const evaluation = await evaluateInterview({
      questions,
      answers: candidateAnswers,
      context: { targetRole: interview.target_role, jobDescription: interview.job_description },
    })

    const questionEvaluationById = new Map(evaluation.questionEvaluations.map((item) => [String(item.questionId), item]))
    for (const row of questionRows.filter((item) => item.question_type === 'mcq')) {
      const questionEvaluation = questionEvaluationById.get(String(row.id))
      if (!questionEvaluation) continue
      const choices = Array.isArray(row.options) ? row.options : []
      const correctAnswer = choices[row.correct_option_index]
      const answered = Boolean(String(row.answer_text || '').trim())
      const correct = answered && String(row.answer_text) === String(correctAnswer)
      questionEvaluation.score = correct ? 10 : 0
      questionEvaluation.feedback = !answered
        ? 'No answer was selected. This question counts as 0.'
        : correct
          ? 'Correct answer.'
          : `Incorrect. Correct answer: ${correctAnswer || 'unavailable'}. ${row.sample_answer || ''}`.trim()
      questionEvaluation.strengths = correct ? ['Correct option selected.'] : []
      questionEvaluation.improvements = correct ? [] : ['Review the correct answer and the concept behind it.']
    }
    evaluation.overallScore = evaluation.questionEvaluations.length
      ? Math.round(evaluation.questionEvaluations.reduce((sum, item) => sum + item.score, 0) / (evaluation.questionEvaluations.length * 10) * 100)
      : 0

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

    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link, dedupe_key)
       VALUES ($1, 'interview_report', 'Interview report ready', $2, $3, $4)
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [
        req.userId,
        `Your ${interview.domain} interview report is ready. You scored ${evaluation.overallScore}%.`,
        `/interview/results/${interviewId}`,
        `interview-report:${interviewId}`,
      ]
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
    `SELECT i.id, i.mode, i.domain, i.difficulty, i.target_role, i.total_score, i.completed_at AS date, i.created_at
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

  // Question texts so the client can render per-question breakdowns.
  const { rows: questionRows } = await pool.query(
    `SELECT a.question_id AS id, q.question_text, q.question_type, q.options,
            a.answer_text, a.answer_mode, a.time_taken_seconds
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     WHERE a.interview_id = $1
     ORDER BY a.id`,
    [interviewId]
  )

  const {
    rows: [row],
  } = await pool.query('SELECT * FROM evaluations WHERE interview_id = $1', [interviewId])
  if (!row) throw new ApiError(404, 'This interview has not been evaluated yet')

  // Repair reports created before skipped questions were included in scoring.
  const previousEvaluations = Array.isArray(row.question_evaluations_json)
    ? row.question_evaluations_json
    : []
  const evaluationsById = new Map(previousEvaluations.map((item) => [String(item.questionId), item]))
  const questionEvaluations = questionRows.map((question, index) => {
    const answerProvided = Boolean(question.answer_text?.trim())
    const previous = evaluationsById.get(String(question.id))
    const score = answerProvided
      ? Math.min(10, Math.max(0, Math.round(Number(previous?.score) || 0)))
      : 0
    return {
      questionId: question.id,
      questionNumber: index + 1,
      score,
      feedback: answerProvided
        ? (previous?.feedback || 'This answer could not be scored.')
        : 'No answer was submitted. This question counts as 0 in the overall score.',
      strengths: answerProvided && Array.isArray(previous?.strengths) ? previous.strengths : [],
      improvements: answerProvided && Array.isArray(previous?.improvements) ? previous.improvements : [],
    }
  })
  const answeredCount = questionRows.filter((question) => Boolean(question.answer_text?.trim())).length
  const overallScore = questionRows.length
    ? Math.round(questionEvaluations.reduce((sum, question) => sum + question.score, 0) / (questionRows.length * 10) * 100)
    : 0
  const completionNote = `Answered ${answeredCount} of ${questionRows.length} questions; unanswered questions count as 0.`
  const previousSummary = (row.summary || '').replace(/^Answered \d+ of \d+ questions; unanswered questions count as 0\.\s*/, '')
  const summary = `${completionNote}${previousSummary ? ` ${previousSummary}` : ''}`

  if (
    row.overall_score !== overallScore
    || previousEvaluations.length !== questionEvaluations.length
    || row.summary !== summary
  ) {
    await pool.query(
      `UPDATE evaluations
       SET overall_score = $2, question_evaluations_json = $3, summary = $4
       WHERE interview_id = $1`,
      [interviewId, overallScore, JSON.stringify(questionEvaluations), summary]
    )
    await pool.query('UPDATE interviews SET total_score = $2 WHERE id = $1', [interviewId, overallScore])
  }

  res.json({
    interview: {
      id: interview.id,
      mode: interview.mode,
      domain: interview.domain,
      difficulty: interview.difficulty,
      targetRole: interview.target_role,
      jobDescription: interview.job_description,
      status: interview.status,
      totalScore: interview.total_score,
      completedAt: interview.completed_at,
      questions: questionRows.map((question) => ({
        ...question,
        answer_text: question.question_type === 'mcq' && question.answer_text
          ? question.answer_text
          : question.answer_text,
        answer: question.answer_text
          ? { answer_text: question.answer_text, answer_mode: question.answer_mode, time_taken_seconds: question.time_taken_seconds }
          : null,
      })),
    },
    evaluation: {
      overallScore,
      answeredCount,
      totalQuestions: questionRows.length,
      summary,
      strengths: row.strengths,
      weaknesses: row.weaknesses,
      improvements: row.improvements,
      questionEvaluations,
      source: row.raw_ai_response?.source || null,
      error: row.raw_ai_response?.error || null,
      createdAt: row.created_at,
    },
  })
}

/** Start a focused retry using the lowest-scoring questions from a completed interview. */
export async function retryWeakQuestions(req, res) {
  const sourceInterviewId = Number(req.params.id)
  const {
    rows: [source],
  } = await pool.query(
    `SELECT i.id, i.mode, i.domain, i.difficulty, i.target_role, i.job_description, e.question_evaluations_json
     FROM interviews i
     JOIN evaluations e ON e.interview_id = i.id
     WHERE i.id = $1 AND i.user_id = $2 AND i.status = 'completed'`,
    [sourceInterviewId, req.userId]
  )
  assertOwns(source)

  const scores = Array.isArray(source.question_evaluations_json)
    ? source.question_evaluations_json
    : []
  if (scores.length === 0) throw new ApiError(400, 'This interview has no question feedback to practice')

  const weakest = [...scores].sort((a, b) => Number(a.score) - Number(b.score))
  const needsWork = weakest.filter((question) => Number(question.score) < 7)
  const selected = (needsWork.length > 0 ? needsWork : weakest.slice(0, 3)).slice(0, 5)
  const questionIds = selected.map((question) => Number(question.questionId)).filter(Number.isInteger)
  if (questionIds.length === 0) throw new ApiError(400, 'This interview has no question feedback to practice')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      rows: [retry],
    } = await client.query(
      `INSERT INTO interviews (user_id, mode, domain, difficulty, target_role, job_description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [req.userId, source.mode, source.domain, source.difficulty, source.target_role, source.job_description]
    )

    const { rows: questions } = await client.query(
      `SELECT id, question_text, category
       FROM questions
       WHERE id = ANY($1::int[])
       ORDER BY array_position($1::int[], id)`,
      [questionIds]
    )

    for (const question of questions) {
      await client.query(
        `INSERT INTO answers (interview_id, question_id, user_id, answer_mode, time_taken_seconds)
         VALUES ($1, $2, $3, 'typed', 0)`,
        [retry.id, question.id, req.userId]
      )
    }
    await client.query('COMMIT')
    res.status(201).json({ interviewId: retry.id, questionCount: questions.length })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
