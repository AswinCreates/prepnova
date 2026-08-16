// TEMPORARY MOCK — replace with real POST /api/interview/evaluate call once backend is ready
export function generateMockEvaluation(answers) {
  return answers.map((a, i) => {
    const hasAnswer = a.answer.trim().length > 0
    const score = hasAnswer ? Math.floor(Math.random() * 4) + 6 : 0 // 6-9 if answered, 0 if blank

    return {
      questionId: a.questionId,
      questionNumber: i + 1,
      answer: a.answer,
      score,
      feedback: !hasAnswer
        ? 'No answer was provided for this question.'
        : score >= 8
        ? 'Strong answer — clear explanation and good use of relevant terminology.'
        : 'Decent attempt — try to include more specific examples and structure your answer more clearly.',
    }
  })
}

export function calculateOverallScore(evaluations) {
  if (evaluations.length === 0) return 0
  const total = evaluations.reduce((sum, e) => sum + e.score, 0)
  return Math.round((total / (evaluations.length * 10)) * 100)
}