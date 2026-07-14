import path from "path"
import dotenv from "dotenv"

// MUST be imported first (before modules that read env at the top level,
// e.g. providers that read GEMINI_MODEL). .env lives at the repo root.
dotenv.config({ path: path.resolve(__dirname, "../../.env") })
