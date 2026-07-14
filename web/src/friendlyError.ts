// The server already returns friendly messages for API errors; this handles the rest
// (e.g. network/fetch failures) and passes server messages through as-is.
export function friendlyError(err: unknown): string {
  const msg = String((err as { message?: string } | undefined)?.message ?? err ?? "")
  const lower = msg.toLowerCase()
  if (/failed to fetch|networkerror|load failed|typeerror: fetch/.test(lower))
    return "Can't reach the server. Check your connection / URL."
  if (/unauthorized|401/.test(lower)) return "Invalid access token. Update your token."
  if (/mikrofon|microphone|getusermedia|permission/.test(lower))
    return "Microphone permission denied. Enable mic access in your browser settings."
  return msg || "Something went wrong. Try again."
}
