import 'dotenv/config'

const API_KEY = process.env.AI_API_KEY
const PROVIDER = (process.env.AI_PROVIDER || '').toLowerCase()
const BASE_URL = (process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')
const TRANSCRIPTION_MODEL = process.env.AI_TRANSCRIPTION_MODEL || 'gemini-3.5-transcribe'
const FALLBACK_MODEL = process.env.AI_MODEL || 'gemini-3.8-flash'
const REQUEST_TIMEOUT_MS = Number(process.env.AI_TRANSCRIPTION_TIMEOUT_MS || process.env.AI_TIMEOUT_MS || 30_000)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class ProviderError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function getRequest(model, audio, mimeType, speakerName, dedicated) {
  const vocabulary = [...new Set(['PrepNova', speakerName].map((term) => term.trim()).filter(Boolean))]
  const instruction = [
    'Transcribe only the candidate speech. Return the words actually spoken with normal punctuation.',
    'Do not translate, paraphrase, summarize, infer, or replace unclear speech with a plausible sentence. Preserve the speaker’s wording.',
    vocabulary.length ? `Preserve these names and terms when they are spoken: ${vocabulary.join(', ')}.` : '',
  ].filter(Boolean).join(' ')

  if (dedicated) {
    return {
      url: `${BASE_URL}/interactions`,
      body: {
        model,
        input: [{ type: 'audio', data: audio, mime_type: mimeType }],
        generation_config: {
          transcription_config: {
            language_codes: ['en-IN'],
            custom_vocabulary: vocabulary,
            mode: { type: 'verbatim' },
          },
        },
      },
      extract: (data) => data.steps
        ?.flatMap((step) => step.content || [])
        .filter((content) => content.type === 'text')
        .map((content) => content.text || '')
        .join(''),
    }
  }

  return {
    url: `${BASE_URL}/models/${model}:generateContent`,
    body: {
      contents: [{ parts: [{ text: instruction }, { inline_data: { mime_type: mimeType, data: audio } }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 4096 },
    },
    extract: (data) => data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join(''),
  }
}

async function requestTranscript(model, audio, mimeType, speakerName, dedicated) {
  const request = getRequest(model, audio, mimeType, speakerName, dedicated)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new ProviderError(response.status, body.error?.message || `HTTP ${response.status}`)
    }

    const transcript = request.extract(body)?.trim()
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
