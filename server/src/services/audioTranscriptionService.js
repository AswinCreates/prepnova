import 'dotenv/config'

const API_KEY = process.env.AI_API_KEY
const PROVIDER = (process.env.AI_PROVIDER || '').toLowerCase()
const BASE_URL = (process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')
const MODEL = process.env.AI_MODEL || 'gemini-3.8-flash'

export async function transcribeAudio(audio, mimeType) {
  if (PROVIDER !== 'gemini' || !API_KEY) {
    const error = new Error('Voice transcription is unavailable. Configure the Gemini AI provider on the server, or use typed answer mode.')
    error.statusCode = 503
    throw error
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    const response = await fetch(`${BASE_URL}/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: 'Transcribe the spoken answer exactly as heard. Return only the transcript text. Do not answer the question, summarize, or add commentary.' },
          { inline_data: { mime_type: mimeType, data: audio } },
        ] }],
        generationConfig: { temperature: 0, maxOutputTokens: 4096 },
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const error = new Error(`Transcription provider returned HTTP ${response.status}`)
      error.statusCode = response.status === 429 ? 503 : 502
      throw error
    }
    const data = await response.json()
    const transcript = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
    if (!transcript) {
      const error = new Error('No speech was detected. Try recording again, or type your answer.')
      error.statusCode = 422
      throw error
    }
    return transcript
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Transcription took too long. Please try recording again.')
      timeoutError.statusCode = 504
      throw timeoutError
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
