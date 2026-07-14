import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import { Provider, OnDelta } from "./types"

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview"

// Controls Gemini "thinking" to cut down time-to-first-token (TTFT).
// GEMINI_THINKING: "off"/"0" = disable (fastest), a number = token budget, "on"/empty = model default.
function thinkingGenerationConfig(): Record<string, unknown> {
  const v = (process.env.GEMINI_THINKING || "off").toLowerCase()
  if (v === "on" || v === "default") return {}
  if (v === "off") return { thinkingConfig: { thinkingBudget: 0 } }
  if (/^\d+$/.test(v)) return { thinkingConfig: { thinkingBudget: parseInt(v, 10) } }
  return { thinkingConfig: { thinkingBudget: 0 } }
}

export class GeminiProvider implements Provider {
  public readonly name = "gemini" as const
  public readonly model = GEMINI_MODEL
  public readonly supportsAudio = true
  private genModel: GenerativeModel

  constructor(apiKey: string) {
    this.genModel = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: GEMINI_MODEL,
      // thinkingConfig isn't typed in SDK 0.24 yet → cast.
      generationConfig: thinkingGenerationConfig() as any
    })
  }

  async generateText(prompt: string): Promise<string> {
    const result = await this.genModel.generateContent(prompt)
    return (await result.response).text()
  }

  async generateFromAudio(base64: string, mimeType: string, prompt: string): Promise<string> {
    const result = await this.genModel.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } }
    ])
    return (await result.response).text()
  }

  async generateTextStream(prompt: string, onDelta: OnDelta): Promise<void> {
    const result = await this.genModel.generateContentStream(prompt)
    for await (const chunk of result.stream) {
      const t = chunk.text()
      if (t) onDelta(t)
    }
  }

  async generateFromAudioStream(
    base64: string,
    mimeType: string,
    prompt: string,
    onDelta: OnDelta
  ): Promise<void> {
    const result = await this.genModel.generateContentStream([
      prompt,
      { inlineData: { data: base64, mimeType } }
    ])
    for await (const chunk of result.stream) {
      const t = chunk.text()
      if (t) onDelta(t)
    }
  }
}
