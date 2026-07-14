// Translate raw provider/network errors into a friendly message for the client.
export function friendlyError(err: unknown): string {
  const msg = String((err as { message?: string } | undefined)?.message ?? err ?? "")
  const lower = msg.toLowerCase()
  if (/(^|\D)429(\D|$)|too many requests|quota|rate.?limit/.test(lower))
    return "API quota/rate limit reached. Wait a moment, or switch provider."
  if (/404|not found|no longer available/.test(lower))
    return "Model not available for this API key. Change the model via .env or pick another provider."
  if (/503|529|overloaded|high demand|unavailable|econn|network|fetch failed|timeout/.test(lower))
    return "AI server is busy or there's a network issue. Try again shortly."
  if (/401|403|authentication|api key|is not set|permission denied/.test(lower))
    return "API key is not set or invalid. Check the server .env configuration."
  if (/transkrip|transcription/.test(lower))
    return "Failed to transcribe audio. For non-Gemini providers, set OPENAI_API_KEY (Whisper) or GEMINI_API_KEY."
  return "Failed to process. " + (msg.slice(0, 160) || "Try again.")
}
