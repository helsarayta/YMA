import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI, { toFile } from "openai"

// Shared STT for providers that don't accept audio directly.
// Priority: OpenAI Whisper (if OPENAI_API_KEY is set), fallback to Gemini.
export async function transcribeAudio(base64: string, mimeType: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    const client = new OpenAI({ apiKey: openaiKey })
    const buffer = Buffer.from(base64, "base64")
    const ext = mimeType.includes("wav")
      ? "wav"
      : mimeType.includes("mp4") || mimeType.includes("m4a")
      ? "m4a"
      : mimeType.includes("mp3")
      ? "mp3"
      : "webm"
    const file = await toFile(buffer, `audio.${ext}`, { type: mimeType })
    const res = await client.audio.transcriptions.create({
      model: process.env.WHISPER_MODEL || "whisper-1",
      file
    })
    return res.text
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-3-flash-preview"
    })
    const result = await model.generateContent([
      "Transcribe this audio verbatim. Return only the transcript text, with no commentary.",
      { inlineData: { data: base64, mimeType } }
    ])
    return (await result.response).text().trim()
  }

  throw new Error(
    "No transcription provider available. Set OPENAI_API_KEY (Whisper) or GEMINI_API_KEY in .env."
  )
}
