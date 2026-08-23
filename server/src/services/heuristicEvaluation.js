/**
 * Deterministic, rule-based fallback evaluator.
 * Used ONLY when the configured AI provider is unreachable/unconfigured, so the
 * interview flow always completes with honest, real feedback derived from the
 * candidate's actual answers (no fabricated AI scores).
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are',
  'it', 'that', 'this', 'with', 'as', 'at', 'by', 'be', 'i', 'we', 'you',
  'if', 'then', 'so', 'but', 'not', 'will', 'can', 'do', 'does', 'was', 'were',
])

function wordsOf(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function uniqueContentWords(text) {
  return new Set(wordsOf(text).filter((w) => w.length > 2 && !STOPWORDS.has(w)))
}

function scoreFor(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return { score: 0, feedback: 'No answer was provided for this question.' }

  const n = wordsOf(trimmed).length
  const unique = uniqueContentWords(trimmed).size

  let score
  if (n >= 40 && unique >= 20) score = 9
  else if (n >= 25 && unique >= 12) score = 8
  else if (n >= 15 && unique >= 8) score = 7
  else if (n >= 8 && unique >= 4) score = 6
  else if (n >= 3) score = 4
  else score = 2

  const strengths =
    n >= 20
      ? ['Answer is reasonably detailed and covers multiple ideas.']
      : ['The core idea is present, though the answer is brief.']
  const improvements =
    n < 15
      ? ['Add more explanation, concrete examples, or structured points to strengthen the answer.']
      : ['Consider structuring the answer with concrete examples and a clear conclusion.']

  return {
    score,
    feedback:
      score >= 8
        ? 'Strong answer — sufficiently detailed with good use of relevant terminology.'
        : score >= 5
        ? 'Decent attempt — try to include more specific examples and structure your answer more clearly.'
        : 'Answer is quite short; expand on your reasoning to improve clarity and completeness.',
    strengths,
    improvements,
  }
}

/**
 * @param {{questions: Array<{id:number, question_text:string}>, answers: Array<{question_id:number, answer_text:string}>}}
 * @returns shape identical to the AI evaluator output.
 */
export function heuristicEvaluation({ questions, answers }) {
  const answerByQ = new Map((answers || []).map((a) => [a.question_id, a.answer_text]))

  const questionEvaluations = (questions || []).map((q, i) => {
    const text = answerByQ.get(q.id) || ''
    const { score, feedback, strengths, improvements } = scoreFor(text)
    return {
      questionId: q.id,
      questionNumber: i + 1,
      score,
      feedback,
      strengths,
      improvements,
    }
  })

  const answered = questionEvaluations.filter((e) => e.score > 0)
  const overall =
    answered.length === 0
      ? 0
      : Math.round((answered.reduce((s, e) => s + e.score, 0) / (questionEvaluations.length * 10)) * 100)

  return {
    overallScore: overall,
    summary:
      overall >= 80
        ? 'Good overall performance with clear, well-structured answers.'
        : overall >= 50
        ? 'Solid attempt — answers are present but can be more detailed and structured.'
        : 'The responses were brief; expanding on examples and reasoning will improve scores.',
    strengths: answered.length > 0 ? answered.flatMap((e) => e.strengths || []) : ['No substantial answers given.'],
    weaknesses: ['Several answers could be more detailed and better structured.'],
    improvements: answered.flatMap((e) => e.improvements || []).slice(0, 5),
    questionEvaluations,
  }
}