import OpenAI from "openai"
import { Provider, OnDelta } from "./types"

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o"

export class OpenAIProvider implements Provider {
  public readonly name = "openai" as const
  public readonly model = OPENAI_MODEL
  public readonly supportsAudio = false
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
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
