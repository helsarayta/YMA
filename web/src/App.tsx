import { useCallback, useEffect, useRef, useState } from "react"
import { useInterviewListener } from "./hooks/useInterviewListener"
import { MarkdownText } from "./components/MarkdownText"
import { friendlyError } from "./friendlyError"
import * as api from "./api"

type Msg = { role: "user" | "ai"; text: string }

const PROVIDER_LABEL: Record<string, string> = {
  gemini: "☁️ Gemini",
  claude: "🅰️ Claude",
  openai: "🤖 OpenAI",
  deepseek: "🐋 DeepSeek"
}

export default function App() {
  const [token, setTokenState] = useState(api.getToken())
  const [tokenInput, setTokenInput] = useState("")
  const [config, setConfig] = useState<api.LlmConfig | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [error, setError] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) return
    api
      .getConfig()
      .then(setConfig)
      .catch((e) => setError(friendlyError(e)))
  }, [token])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Streaming: create an empty AI bubble, then append incoming deltas.
  const onAnswerStart = useCallback(() => {
    setMessages((m) => [...m, { role: "ai", text: "" }])
  }, [])
  const onAnswerDelta = useCallback((delta: string) => {
    setMessages((m) => {
      const copy = m.slice()
      const last = copy[copy.length - 1]
      if (last && last.role === "ai") copy[copy.length - 1] = { ...last, text: last.text + delta }
      return copy
    })
  }, [])
  const onError = useCallback((msg: string) => {
    // Drop a stuck empty AI bubble if the error arrives before the first token
    setMessages((m) => {
      const last = m[m.length - 1]
      return last && last.role === "ai" && last.text === "" ? m.slice(0, -1) : m
    })
    setError(msg)
  }, [])

  const { isListening, isAnswering, startListening, stopListening, answerNow } =
    useInterviewListener({
      analyzeStream: api.interviewAnswerStream,
      onAnswerStart,
      onAnswerDelta,
      onError
    })

  const saveToken = () => {
    const t = tokenInput.trim()
    if (!t) return
    api.setToken(t)
    setTokenState(t)
    setError("")
  }

  const changeToken = () => {
    api.clearToken()
    setTokenState("")
    setTokenInput("")
    setConfig(null)
    setError("")
  }

  const switchProvider = async (p: string) => {
    try {
      const c = await api.setProvider(p)
      setConfig(c)
      setMessages((m) => [...m, { role: "ai", text: `🔄 Switched to ${PROVIDER_LABEL[p] || p} — ${c.model}` }])
    } catch (e) {
      setError(friendlyError(e))
    }
  }

  // --- Token screen (if not set yet) ---
  if (!token) {
    return (
      <main className="gate">
        <h1>AI Interview Assistant</h1>
        <p className="sub">Enter your access token (from the server .env)</p>
        <input
          className="input"
          type="password"
          placeholder="ACCESS_TOKEN"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveToken()}
        />
        <button className="btn-primary" onClick={saveToken}>
          Save & Enter
        </button>
        {error && <div className="error">{error}</div>}
      </main>
    )
  }

  // --- Main screen ---
  return (
    <div className="app-main">
      <header className="topbar">
        <div className="brand">🎧 Interview Assistant</div>
        <div className="current">
          {config ? `${PROVIDER_LABEL[config.provider] || config.provider} · ${config.model}` : "…"}
        </div>
        <button className="token-btn" onClick={changeToken} title="Change access token">
          🔑
        </button>
      </header>

      {config && config.providersAvailable.length > 1 && (
        <div className="providers">
          {config.providersAvailable.map((p) => (
            <button
              key={p}
              className={`chip ${config.provider === p ? "chip-active" : ""}`}
              onClick={() => switchProvider(p)}
            >
              {PROVIDER_LABEL[p] || p}
            </button>
          ))}
        </div>
      )}

      <div className="chat">
        {messages.length === 0 && (
          <div className="empty">
            Tap <b>Listen</b>, place your phone near the laptop speaker, then tap <b>Answer</b> once
            the interviewer finishes asking.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === "ai" ? (
              m.text ? (
                <MarkdownText text={m.text} />
              ) : (
                <span className="typing">● ● ●</span>
              )
            ) : (
              m.text
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {error && (
        <div className="error" onClick={() => setError("")}>
          {error} <span className="dismiss">✕</span>
        </div>
      )}

      <div className="controls">
        <button
          className={`btn-listen ${isListening ? "on" : ""}`}
          onClick={() => (isListening ? stopListening() : startListening())}
        >
          {isListening ? "● Listening — Stop" : "🎧 Listen"}
        </button>
        {isListening && (
          <button className="btn-answer" onClick={answerNow} disabled={isAnswering}>
            {isAnswering ? "… Answering" : "🧠 Answer"}
          </button>
        )}
      </div>
    </div>
  )
}
