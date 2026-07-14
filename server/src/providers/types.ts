export type ProviderName = "gemini" | "claude" | "openai" | "deepseek"

export type OnDelta = (text: string) => void

export interface Provider {
  readonly name: ProviderName
  readonly model: string
  // Gemini can process audio directly; other providers need STT first.
  readonly supportsAudio: boolean
  generateText(prompt: string): Promise<string>
  generateFromAudio?(base64: string, mimeType: string, prompt: string): Promise<string>
  // Streaming (optional): calls onDelta for each chunk of text.
  generateTextStream?(prompt: string, onDelta: OnDelta): Promise<void>
  generateFromAudioStream?(
    base64: string,
    mimeType: string,
    prompt: string,
    onDelta: OnDelta
  ): Promise<void>
}

// API key env var name per provider.
export const KEY_ENV: Record<ProviderName, string> = {
  gemini: "GEMINI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY"
}
