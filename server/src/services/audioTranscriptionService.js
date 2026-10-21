import 'dotenv/config'

const API_KEY = process.env.AI_API_KEY
const PROVIDER = (process.env.AI_PROVIDER || '').toLowerCase()
const BASE_URL = (process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')
const TRANSCRIPTION_MODEL = process.env.AI_TRANSCRIPTION_MODEL || 'gemini-3.5-transcribe'
const FALLBACK_MODEL = process.env.AI_MODEL || 'gemini-3.8-flash'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class ProviderError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function requestTranscript(model, audio, mimeType, speakerName, dedicated) {
  const instruction = [
    'Transcribe only the candidate speech in this audio. Return only the words actually spoken, with normal punctuation.',
    'Do not translate, paraphrase, summarize, infer, or replace unclear speech with a plausible sentence. If a word cannot be heard, omit only that word.',
    `The speaker may say the proper name “${speakerName || 'PrepNova'}”. Preserve the spoken name exactly.`,
  ].join(' ')
  const parts = []
  if (!dedicated) parts.push({ text: instruction })
  parts.push({ inline_data: { mime_type: mimeType, data: audio } })
  const generationConfig = dedicated
    ? {
        audioTranscriptionConfig: {
          languageCodes: ['en-IN'],
          customVocabulary: ['PrepNova', speakerName].filter(Boolean),
          mode: 'VERBATIM',
        },
        maxOutputTokens: 4096,
      }
    : { temperature: 0, maxOutputTokens: 4096 }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    const response = await fetch(`${BASE_URL}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify({ contents: [{ parts }], generationConfig }),
      signal: controller.signal,
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      const providerMessage = body.error?.message || `HTTP ${response.status}`
      throw new ProviderError(response.status, providerMessage)
    }
    const transcript = body.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
    if (!transcript) throw new ProviderError(422, 'The model returned an empty transcript')
    return transcript
  } catch (error) {
    if (error.name === 'AbortError') throw new ProviderError(504, 'Gemini transcription timed out')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function requestWithRetry(model, audio, mimeType, speakerName, dedicated) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestTranscript(model, audio, mimeType, speakerName, dedicated)
    } catch (error) {
      const retryable = error instanceof ProviderError && [429, 500, 502, 503, 504].includes(error.status)
      if (!retryable || attempt === 1) throw error
      await sleep(700)
    }
  }
}

export async function transcribeAudio(audio, mimeType, speakerName = '') {
  if (PROVIDER !== 'gemini' || !API_KEY) {
    const error = new Error('Voice transcription is unavailable. Configure the Gemini AI provider on the server, or use typed answer mode.')
    error.statusCode = 503
    throw error
  }

  try {
    return await requestWithRetry(TRANSCRIPTION_MODEL, audio, mimeType, speakerName.trim(), true)
  } catch (primaryError) {
    if (primaryError instanceof ProviderError && primaryError.status === 422) {
      const error = new Error('No clear speech was detected. Please record again in a quieter place, or use typed answer mode.')
      error.statusCode = 422
      throw error
    }
    if (FALLBACK_MODEL !== TRANSCRIPTION_MODEL) {
      console.warn(`[speech-transcription] ${TRANSCRIPTION_MODEL} failed (${primaryError.message}); trying ${FALLBACK_MODEL}`)
      try {
        return await requestWithRetry(FALLBACK_MODEL, audio, mimeType, speakerName.trim(), false)
      } catch (fallbackError) {
        console.error(`[speech-transcription] Fallback failed: ${fallbackError.message}`)
      }
    } else {
      console.error(`[speech-transcription] Transcription failed: ${primaryError.message}`)
    }

    const error = new Error('Gemini transcription is temporarily unavailable. Please try again, or use typed answer mode.')
    error.statusCode = primaryError instanceof ProviderError && primaryError.status === 422 ? 422 : 503
    throw error
  }
}
