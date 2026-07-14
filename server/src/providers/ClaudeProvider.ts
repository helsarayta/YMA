import Anthropic from "@anthropic-ai/sdk"
import { Provider, OnDelta } from "./types"

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8"

export class ClaudeProvider implements Provider {
  public readonly name = "claude" as const
  public readonly model = CLAUDE_MODEL
  public readonly supportsAudio = false
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async generateText(prompt: string): Promise<string> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    })
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim()
  }

  async generateTextStream(prompt: string, onDelta: OnDelta): Promise<void> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    })
    stream.on("text", (t) => onDelta(t))
    await stream.finalMessage()
  }
}
