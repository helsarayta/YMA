# AI Interview Assistant — Web / PWA

An interview assistant opened in a **phone browser**: the phone is placed near the laptop, the phone's mic listens to the interviewer via the **laptop speaker**, and answers appear on the phone screen. Since the assistant never appears on the laptop screen, it's **safe from screen sharing** (including "Entire Screen").


## Structure

```
server/   Express + TS — backend proxy (holds the API key, transcription, calls the LLM)
web/      Vite + React + TS — mobile-first UI (mic, Listen/Answer buttons, chat)
```

## Running (dev)

```bash
npm install            # once, at the root (workspaces)
cp .env.example .env   # then fill in ACCESS_TOKEN + at least 1 API key
npm run dev            # server (3000) + web (5173) together
```

Open `http://localhost:5173`. Calls to `/api/*` are automatically proxied to the server.

## Build & production

```bash
npm run build   # build web + compile server
npm start       # server serves the built web app + API on a single port
```

## Opening on your phone (via ngrok)

The microphone in a phone browser only works over **HTTPS** — that's why we use ngrok (free):

1. **One-time setup:** sign up at [ngrok.com](https://ngrok.com) → install (`brew install ngrok`) → `ngrok config add-authtoken <your-token>`. Optional but recommended: reserve **1 free static domain** in the ngrok dashboard so the URL doesn't change.
2. Run the production app:
   ```bash
   npm run build && npm start   # server + web on port 3000
   ```
3. In another terminal:
   ```bash
   ngrok http 3000
   # or with a static domain:
   ngrok http 3000 --domain=your-name.ngrok-free.app
   ```
4. Open the `https://...` URL given by ngrok in your **phone browser** (Safari/Chrome). Click "Visit Site" on the ngrok interstitial (once per session).
5. Enter the **ACCESS_TOKEN** (from the server's `.env`) → allow microphone access.
6. **Add to Home Screen** to turn it into an app: Safari → Share button → *Add to Home Screen* (Android Chrome: ⋮ menu → *Install app*).

### Usage during the interview
- Place the phone near the **laptop speaker** (speaker on, not headphones).
- Tap **🎧 Listen** when the interview starts — the phone screen is kept awake (wake lock).
- Once the interviewer finishes asking → tap **🧠 Answer** → the answer appears on the phone.
- The assistant never appears on the laptop screen → safe from any screen sharing.

## Scripts

| Command | Function |
|---|---|
| `npm run dev` | Dev server (web + backend) |
| `npm run build` | Build web + compile server |
| `npm start` | Run production (1 process, 1 port) |
| `npm run typecheck` | Typecheck server + web |
</content>
</invoke>
