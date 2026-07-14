import "./env" // MUST be first: loads .env before other modules read env
import fs from "fs"
import path from "path"
import express from "express"
import { requireToken } from "./auth"
import { llm, availableProviders } from "./llm"
import { friendlyError } from "./friendlyError"
import { ProviderName, KEY_ENV } from "./providers/types"

const app = express()
const PORT = Number(process.env.PORT) || 3000

// 30s of base64 audio safely fits under 15 MB.
app.use(express.json({ limit: "15mb" }))

// --- Token-free routes ---
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() })
})

// --- All /api/* routes below require a token ---
app.use("/api", requireToken)

app.get("/api/config", (_req, res) => {
  try {
    res.json(llm.getConfig())
  } catch (err) {
    res.status(500).json({ error: friendlyError(err) })
  }
})

app.post("/api/provider", (req, res) => {
  const name = req.body?.provider as ProviderName | undefined
  if (!name || !(name in KEY_ENV)) {
    res.status(400).json({ error: "invalid provider" })
    return
  }
  if (!availableProviders().includes(name)) {
    res.status(400).json({ error: `${KEY_ENV[name]} is not set in the server .env` })
    return
  }
  try {
    res.json(llm.setProvider(name))
  } catch (err) {
    res.status(500).json({ error: friendlyError(err) })
  }
})

app.post("/api/chat", async (req, res) => {
  const message = req.body?.message
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is empty" })
    return
  }
  try {
    const text = await llm.chat(message)
    res.json({ text })
  } catch (err) {
    console.error("[chat]", err)
    res.status(502).json({ error: friendlyError(err) })
  }
})

app.post("/api/interview-answer", async (req, res) => {
  const { audioBase64, mimeType } = req.body || {}
  if (typeof audioBase64 !== "string" || !audioBase64) {
    res.status(400).json({ error: "audioBase64 is empty" })
    return
  }
  try {
    const text = await llm.interviewAnswer(audioBase64, mimeType || "audio/webm")
    res.json({ text, timestamp: Date.now() })
  } catch (err) {
    console.error("[interview-answer]", err)
    res.status(502).json({ error: friendlyError(err) })
  }
})

app.post("/api/interview-answer-stream", async (req, res) => {
  const { audioBase64, mimeType } = req.body || {}
  if (typeof audioBase64 !== "string" || !audioBase64) {
    res.status(400).json({ error: "audioBase64 is empty" })
    return
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("X-Accel-Buffering", "no") // prevent proxy/ngrok from buffering the stream
  try {
    await llm.interviewAnswerStream(audioBase64, mimeType || "audio/webm", (delta) => {
      res.write(delta)
    })
    res.end()
  } catch (err) {
    console.error("[interview-answer-stream]", err)
    if (!res.headersSent) {
      res.status(502).json({ error: friendlyError(err) })
    } else {
      res.write(`\n\n⚠️ ${friendlyError(err)}`)
      res.end()
    }
  }
})

// --- Serve the frontend build in production (guard: only if it exists) ---
const webDist = path.resolve(__dirname, "../../web/dist")
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist))
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"))
  })
}

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
