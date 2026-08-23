import 'dotenv/config'
import { heuristicEvaluation } from './heuristicEvaluation.js'

const PROVIDER = (process.env.AI_PROVIDER || 'openai').toLowerCase()
const API_KEY = process.env.AI_API_KEY
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini'
const BASE_URL = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 30000)

const OUTPUT_SCHEMA = `{
  "overallScore": 85,
  "summary": "Detailed feedback summary...",
  "strengths": ["Clear explanation of closures", "Good problem-solving approach"],
  "weaknesses": ["Missed edge cases in async code"],
  "improvements": ["Review Promise chaining vs async/await"],
  "questionEvaluations": [
    { "questionId": 1, "score": 8, "feedback": "Strong answer...", "strengths": ["Accurate definition"], "improvements": ["Provide a concrete example"] }
  ]
}`

function buildPrompt(questions, answers) {
  const answerByQ = new Map((answers || []).map((a) => [a.question_id, a.answer_text]))
  const lines = (questions || [])
    .map((q, i) => {
      const text = answerByQ.get(q.id) || '(no answer provided)'
      return `Q${i + 1}) ${q.question_text}\nCandidate answer: ${text}`
    })
    .join('\n\n')

  return [
    'You are a senior technical interview evaluator for a mock interview platform.',
    'Evaluate each answer fairly on a 0-10 integer scale. Provide constructive, specific feedback.',
    'Respond with VALID JSON only (no markdown fences, no extra prose) matching EXACTLY this schema:',
    OUTPUT_SCHEMA,
    'Rules:',
    '- overallScore must be an integer 0-100 (average of question scores scaled).',
    '- questionEvaluations must contain ONE entry per question, using the question IDs provided below.',
    '- Each question score must be an integer 0-10.',
    '- strengths/weaknesses/improvements are arrays of concise strings.',
    '- An unanswered question (no answer) must score 0.',
    '',
    'Questions and candidate answers:',
    '---',
    lines,
    '---',
  ].join('\n')
}

/** Sanitize an AI response into a guaranteed-valid, complete evaluation object. */
function sanitize(raw, questions) {
  const byId = {}
  for (const qe of Array.isArray(raw.questionEvaluations) ? raw.questionEvaluations : []) {
    if (qe && typeof qe.questionId !== 'undefined') byId[String(qe.questionId)] = qe
  }

  const questionEvaluations = (questions || []).map((q, i) => {
    const qe = byId[String(q.id)]
    const score = Number(qe?.score)
    return {
      questionId: q.id,
      questionNumber: i + 1,
      score: Number.isFinite(score) ? Math.min(10, Math.max(0, Math.round(score))) : 0,
      feedback: typeof qe?.feedback === 'string' ? qe.feedback : 'No feedback provided for this question.',
      strengths: Array.isArray(qe?.strengths) ? qe.strengths.filter((s) => typeof s === 'string') : [],
      improvements: Array.isArray(qe?.improvements) ? qe.improvements.filter((s) => typeof s === 'string') : [],
    }
  })

  const overall = Math.min(100, Math.max(0, Math.round(Number(raw.overallScore) || 0)))

  return {
    overallScore: overall,
    summary: typeof raw.summary === 'string' ? raw.summary : 'Evaluation complete.',
    strengths: Array.isArray(raw.strengths) ? raw.strengths.filter((s) => typeof s === 'string') : [],
    weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses.filter((s) => typeof s === 'string') : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements.filter((s) => typeof s === 'string') : [],
    questionEvaluations,
  }
}
function parseJSON(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) throw new Error('Empty AI response')
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('AI response was not valid JSON')
  }
}

/* -------------------- Provider request builders -------------------- */
function buildOpenAIRequest(prompt) {
  return {
    url: `${BASE_URL}/chat/completions`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You output strictly valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
    extract: (d) => d.choices?.[0]?.message?.content,
  }
}

function buildGeminiRequest(prompt) {
  return {
    url: `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    extract: (d) => d.candidates?.[0]?.content?.parts?.map((p) => p.text).join(''),
  }
}

function buildAnthropicRequest(prompt) {
  return {
    url: `${BASE_URL}/messages`,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    extract: (d) => d.content?.map((b) => b.text).join(''),
  }
}

async function callProvider(prompt) {
  if (!API_KEY) throw new Error('AI_API_KEY is not configured')
  const builder =
    PROVIDER === 'gemini' ? buildGeminiRequest : PROVIDER === 'anthropic' ? buildAnthropicRequest : buildOpenAIRequest
  const { url, headers, body, extract } = builder(prompt)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal })
    if (!res.ok) throw new Error(`AI provider returned HTTP ${res.status}`)
    const data = await res.json()
    const text = extract(data)
    if (!text) throw new Error('AI provider returned an empty/malformed response')
    return text
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Evaluate an interview using the configured AI provider.
 * Falls back gracefully to the deterministic heuristic evaluator on any
 * provider error / timeout / malformed output — it never crashes the request
 * and never fabricates AI scores.
 */
export async function evaluateInterview({ questions, answers }) {
  try {
    const prompt = buildPrompt(questions, answers)
    const text = await callProvider(prompt)
    const raw = parseJSON(text)
    const result = sanitize(raw, questions)
    return { ...result, source: 'ai' }
  } catch (err) {
    console.warn(`[ai-evaluation] Falling back to heuristic: ${err.message}`)
    const result = heuristicEvaluation({ questions, answers })
    return { ...result, source: 'heuristic', error: err.message }
  }
}

export { buildPrompt }