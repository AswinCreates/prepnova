function safeFilename(value) {
  return String(value || 'interview-report')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function reportFilename(interview) {
  const date = new Date(interview.completedAt || interview.createdAt)
  const datePart = Number.isNaN(date.getTime()) ? '' : `-${date.toISOString().slice(0, 10)}`
  return `${safeFilename(interview.targetRole || interview.domain)}-interview-report${datePart}`
}

function formatDateTime(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function reportSections(interview, evaluation, candidateName) {
  const questions = interview.questions || []
  const questionEvaluationById = new Map(
    (evaluation.questionEvaluations || []).map((item) => [String(item.questionId), item])
  )

  return {
    title: 'PrepNova Interview Report',
    candidateName: candidateName || 'Candidate',
    completedAt: formatDateTime(interview.completedAt || interview.createdAt),
    overview: [
      `Candidate: ${candidateName || 'Candidate'}`,
      `Target role: ${interview.targetRole || 'Not specified'}`,
      `Interview: ${interview.mode} · ${interview.domain} · ${interview.difficulty}`,
      `Completed: ${formatDateTime(interview.completedAt || interview.createdAt)}`,
      `Overall score: ${evaluation.overallScore}%`,
    ],
    summary: evaluation.summary || 'No summary was provided.',
    strengths: evaluation.strengths || [],
    weaknesses: evaluation.weaknesses || [],
    improvements: evaluation.improvements || [],
    questions: questions.map((question, index) => {
      const result = questionEvaluationById.get(String(question.id))
      return {
        number: index + 1,
        text: question.question_text,
        score: result ? `${result.score}/10` : 'Not scored',
        answer: question.answer?.answer_text || 'No answer recorded.',
        answerMode: question.answer?.answer_mode || null,
        feedback: result?.feedback || 'No feedback available.',
        strengths: result?.strengths || [],
        improvements: result?.improvements || [],
      }
    }),
  }
}

function addPdfParagraph(doc, text, options = {}) {
  const { margin, width, pageHeight, state } = options
  const fontSize = options.fontSize || 10
  doc.setFont('helvetica', options.bold ? 'bold' : 'normal')
  doc.setFontSize(fontSize)
  if (options.color) doc.setTextColor(...options.color)
  const lines = doc.splitTextToSize(String(text || ''), width)
  const lineHeight = fontSize * 0.48
  let offset = 0
  while (offset < lines.length) {
    const availableLines = Math.floor((pageHeight - margin - state.y) / lineHeight)
    if (availableLines < 1) {
      doc.addPage()
      state.y = margin
      continue
    }
    const pageLines = lines.slice(offset, offset + availableLines)
    doc.text(pageLines, margin, state.y)
    state.y += pageLines.length * lineHeight
    offset += pageLines.length
  }
  state.y += options.gap ?? 3
  if (state.y > pageHeight - margin) {
    doc.addPage()
    state.y = margin
  }
}

export async function downloadInterviewPdf(interview, evaluation, candidateName) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const report = reportSections(interview, evaluation, candidateName)
  const margin = 18
  const pageHeight = doc.internal.pageSize.getHeight()
  const state = { y: 23 }
  const common = { margin, width: doc.internal.pageSize.getWidth() - margin * 2, pageHeight, state }

  doc.setFillColor(23, 111, 104)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 4, 'F')
  addPdfParagraph(doc, report.title, { ...common, fontSize: 21, bold: true, color: [20, 44, 54], gap: 4 })
  addPdfParagraph(doc, `${report.candidateName} · ${report.completedAt}`, { ...common, fontSize: 10, color: [97, 116, 123], gap: 8 })

  addPdfParagraph(doc, 'Interview overview', { ...common, fontSize: 13, bold: true, color: [23, 111, 104], gap: 3 })
  for (const line of report.overview.slice(1)) addPdfParagraph(doc, line, { ...common, fontSize: 10, gap: 1.5 })
  common.state.y += 3

  addPdfParagraph(doc, 'Summary', { ...common, fontSize: 13, bold: true, color: [23, 111, 104] })
  addPdfParagraph(doc, report.summary, { ...common, fontSize: 10, color: [45, 63, 69], gap: 7 })

  for (const [heading, items] of [['Strengths', report.strengths], ['Areas to improve', report.weaknesses], ['Next steps', report.improvements]]) {
    if (!items.length) continue
    addPdfParagraph(doc, heading, { ...common, fontSize: 12, bold: true, color: [23, 111, 104], gap: 2 })
    for (const item of items) addPdfParagraph(doc, `- ${item}`, { ...common, fontSize: 9.5, color: [45, 63, 69], gap: 1.5 })
    common.state.y += 3
  }

  addPdfParagraph(doc, 'Question breakdown', { ...common, fontSize: 13, bold: true, color: [23, 111, 104], gap: 4 })
  for (const question of report.questions) {
    addPdfParagraph(doc, `Question ${question.number} · ${question.score}`, { ...common, fontSize: 11, bold: true, color: [20, 44, 54], gap: 1.5 })
    addPdfParagraph(doc, question.text, { ...common, fontSize: 10, bold: true, color: [45, 63, 69], gap: 2 })
    addPdfParagraph(doc, `Your answer${question.answerMode ? ` (${question.answerMode})` : ''}: ${question.answer}`, { ...common, fontSize: 9, color: [82, 101, 107], gap: 2 })
    addPdfParagraph(doc, `Feedback: ${question.feedback}`, { ...common, fontSize: 9, color: [45, 63, 69], gap: 2 })
    for (const item of question.improvements) addPdfParagraph(doc, `Suggestion: ${item}`, { ...common, fontSize: 9, color: [82, 101, 107], gap: 1.5 })
    common.state.y += 4
  }

  doc.save(`${reportFilename(interview)}.pdf`)
}

export async function downloadInterviewDocx(interview, evaluation, candidateName) {
  const { Document, HeadingLevel, Packer, Paragraph } = await import('docx')
  const report = reportSections(interview, evaluation, candidateName)
  const children = [
    new Paragraph({ text: report.title, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `${report.candidateName} · ${report.completedAt}` }),
    new Paragraph({ text: 'Interview overview', heading: HeadingLevel.HEADING_1 }),
    ...report.overview.slice(1).map((line) => new Paragraph({ text: line, bullet: { indent: 360 } })),
    new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: report.summary }),
  ]

  for (const [heading, items] of [['Strengths', report.strengths], ['Areas to improve', report.weaknesses], ['Next steps', report.improvements]]) {
    if (!items.length) continue
    children.push(new Paragraph({ text: heading, heading: HeadingLevel.HEADING_1 }))
    children.push(...items.map((item) => new Paragraph({ text: item, bullet: { indent: 360 } })))
  }

  children.push(new Paragraph({ text: 'Question breakdown', heading: HeadingLevel.HEADING_1 }))
  for (const question of report.questions) {
    children.push(
      new Paragraph({ text: `Question ${question.number} · ${question.score}`, heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: question.text }),
      new Paragraph({ text: `Your answer${question.answerMode ? ` (${question.answerMode})` : ''}:`, heading: HeadingLevel.HEADING_3 }),
      new Paragraph({ text: question.answer }),
      new Paragraph({ text: 'Feedback:', heading: HeadingLevel.HEADING_3 }),
      new Paragraph({ text: question.feedback }),
    )
    if (question.improvements.length) {
      children.push(new Paragraph({ text: 'Suggestions', heading: HeadingLevel.HEADING_3 }))
      children.push(...question.improvements.map((item) => new Paragraph({ text: item, bullet: { indent: 360 } })))
    }
  }

  const document = new Document({ sections: [{ properties: {}, children }] })
  saveBlob(await Packer.toBlob(document), `${reportFilename(interview)}.docx`)
}
