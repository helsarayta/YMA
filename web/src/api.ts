// Small API client. Token is stored in localStorage and sent as a header.
const TOKEN_KEY = "access_token"

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ""
}
export function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t)
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export interface LlmConfig {
  provider: string
  model: string
  providersAvailable: string[]
}

async function apiFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-access-token": getToken(),
      "ngrok-skip-browser-warning": "true", // skip the free ngrok interstitial
      ...(init?.headers || {})
    }
  })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`)
  }
  return json
}

export function getConfig(): Promise<LlmConfig> {
  return apiFetch("/api/config")
}

export function setProvider(provider: string): Promise<LlmConfig> {
  return apiFetch("/api/provider", {
    method: "POST",
    body: JSON.stringify({ provider })
  })
}

export async function chat(message: string): Promise<string> {
  const r = await apiFetch("/api/chat", { method: "POST", body: JSON.stringify({ message }) })
  return r.text
}

export async function interviewAnswer(audioBase64: string, mimeType: string): Promise<string> {
  const r = await apiFetch("/api/interview-answer", {
    method: "POST",
    body: JSON.stringify({ audioBase64, mimeType })
  })
  return r.text
}

// Streaming version: onDelta is called for each chunk of text as it arrives.
export async function interviewAnswerStream(
  audioBase64: string,
  mimeType: string,
  onDelta: (t: string) => void
): Promise<void> {
  const res = await fetch("/api/interview-answer-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": getToken(),
      "ngrok-skip-browser-warning": "true"
    },
    body: JSON.stringify({ audioBase64, mimeType })
  })
  if (!res.ok || !res.body) {
    let err = `HTTP ${res.status}`
    try {
      const j = await res.json()
      err = j?.error || err
    } catch {
      /* body isn't JSON */
    }
    throw new Error(err)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (chunk) onDelta(chunk)
  }
}
