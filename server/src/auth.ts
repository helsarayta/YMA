import { Request, Response, NextFunction } from "express"

// Protect /api/* routes with a simple token. Tunnel/VPS URLs are public,
// so without this anyone could use up your API quota.
export function requireToken(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ACCESS_TOKEN
  if (!expected) {
    res.status(500).json({ error: "ACCESS_TOKEN is not set on the server (.env)." })
    return
  }
  const provided =
    req.header("x-access-token") || (typeof req.query.t === "string" ? req.query.t : "")
  if (provided !== expected) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }
  next()
}
