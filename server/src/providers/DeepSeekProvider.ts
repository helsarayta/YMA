import OpenAI from "openai"
import { Provider, OnDelta } from "./types"

// DeepSeek uses an OpenAI-compatible API, just a different baseURL.
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat"
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"

export class DeepSeekProvider implements Provider {
  public readonly name = "deepseek" as const
  public readonly model = DEEPSEEK_MODEL
  public readonly supportsAudio = false
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, baseURL: DEEPSEEK_BASE_URL })
  }

  async generateText(prompt: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }]
    })
    return res.choices[0]?.message?.content?.trim() || ""
  }

  async generateTextStream(prompt: string, onDelta: OnDelta): Promise<void> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      stream: true
    })
    for await (const chunk of stream) {
      const t = chunk.choices[0]?.delta?.content
      if (t) onDelta(t)
    }
  }
}
