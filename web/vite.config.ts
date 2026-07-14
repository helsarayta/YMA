import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In dev, forward /api calls to the Express server (port 3000)
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
})
