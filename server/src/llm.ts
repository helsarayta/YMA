import { Provider, ProviderName, KEY_ENV, OnDelta } from "./providers/types"
import { GeminiProvider } from "./providers/GeminiProvider"
import { ClaudeProvider } from "./providers/ClaudeProvider"
import { OpenAIProvider } from "./providers/OpenAIProvider"
import { DeepSeekProvider } from "./providers/DeepSeekProvider"
import { transcribeAudio } from "./providers/transcription"

// Prompt emphasizes brevity (speeds up generation & is more practical to read during the interview).
const INTERVIEW_AUDIO_PROMPT = `The following audio is a question asked by an interviewer to a job candidate. Be brief and fast: first restate the question in one short line, then give the answer the candidate can say out loud in 2-4 short sentences or a few bullet points. Lead with the key point. For coding/technical questions, include the core idea and time/space complexity concisely. Do not over-explain. Respond in Markdown. If there is no discernible question, say so in one line.`

const INTERVIEW_TEXT_PROMPT = `The following is a question asked by an interviewer to a job candidate (transcribed from audio). Be brief and fast: first restate the question in one short line, then give the answer the candidate can say out loud in 2-4 short sentences or a few bullet points. Lead with the key point. For coding/technical questions, include the core idea and time/space complexity concisely. Do not over-explain. Respond in Markdown. If there is no discernible question, say so in one line.`

export function availableProviders(): ProviderName[] {
  return (Object.keys(KEY_ENV) as ProviderName[]).filter((n) => !!process.env[KEY_ENV[n]])
}

function makeProvider(name: ProviderName): Provider {
  const key = process.env[KEY_ENV[name]]
  if (!key) throw new Error(`${KEY_ENV[name]} is not set in .env`)
  switch (name) {
    case "gemini":
      return new GeminiProvider(key)
    case "claude":
      return new ClaudeProvider(key)
    case "openai":
      return new OpenAIProvider(key)
    case "deepseek":
      return new DeepSeekProvider(key)
  }
}

class LlmService {
  private active: Provider | null = null

  private ensure(): Provider {
    if (this.active) return this.active
    const avail = availableProviders()
    if (avail.length === 0) {
      throw new Error("No provider has an API key. Set one of the keys in the server .env.")
    }
    const first = avail.includes("gemini") ? "gemini" : avail[0]
    this.active = makeProvider(first)
    return this.active
  }

  getConfig() {
    const p = this.ensure()
    return { provider: p.name, model: p.model, providersAvailable: availableProviders() }
  }

  setProvider(name: ProviderName) {
    this.active = makeProvider(name)
    return this.getConfig()
  }

  async chat(message: string): Promise<string> {
    return this.ensure().generateText(message)
  }

  async interviewAnswer(base64: string, mimeType: string): Promise<string> {
    const p = this.ensure()
    if (p.supportsAudio && p.generateFromAudio) {
      return p.generateFromAudio(base64, mimeType, INTERVIEW_AUDIO_PROMPT)
    }
    // Non-audio provider: transcribe first, then answer from text.
    const transcript = await transcribeAudio(base64, mimeType)
    return p.generateText(`${INTERVIEW_TEXT_PROMPT}\n\nInterviewer's question (transcribed): "${transcript}"`)
  }

  async interviewAnswerStream(base64: string, mimeType: string, onDelta: OnDelta): Promise<void> {
    const p = this.ensure()
    if (p.supportsAudio && p.generateFromAudioStream) {
      return p.generateFromAudioStream(base64, mimeType, INTERVIEW_AUDIO_PROMPT, onDelta)
    }
    const transcript = await transcribeAudio(base64, mimeType)
    const prompt = `${INTERVIEW_TEXT_PROMPT}\n\nInterviewer's question (transcribed): "${transcript}"`
    if (p.generateTextStream) {
      return p.generateTextStream(prompt, onDelta)
    }
    // Fallback: provider without streaming — send once.
    onDelta(await p.generateText(prompt))
  }
}

export const llm = new LlmService()
