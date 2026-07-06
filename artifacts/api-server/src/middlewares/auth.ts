/**
 * Cookie-based session middleware for general user auth.
 *
 * Reads a session token from the `tmh_session` httpOnly cookie. If valid and
 * not expired, decorates the request with `req.userId` and slides the
 * session's expiry by updating `last_seen_at`. Never blocks on its own —
 * use `requireAuth` for protected routes.
 */

import type { Request, Response, NextFunction } from "express"
import { db, userSessionsTable } from "@workspace/db"
import { and, eq, gt } from "drizzle-orm"

/**
 * Augmented Request type — `userId` and `sessionToken` are populated by
 * optionalAuth when a valid session cookie is present. We use intersection
 * casting at access sites instead of a global module augmentation because
 * Express 5's type tree differs slightly from Express 4 and the workspace's
 * mixed-version setup makes the augmentation unreliable.
 */
export type AuthedRequest = Request & {
  userId?: number
  sessionToken?: string
}

export const SESSION_COOKIE_NAME = "tmh_session"
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

// Avoid hitting the DB on every request when last_seen_at was just touched.
const SLIDE_THROTTLE_MS = 5 * 60 * 1000 // 5 minutes

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const r = req as AuthedRequest
  const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE_NAME]
  if (!token) return next()

  try {
    const [session] = await db
      .select()
      .from(userSessionsTable)
      .where(and(eq(userSessionsTable.token, token), gt(userSessionsTable.expiresAt, new Date())))

    if (session) {
      r.userId = session.userId
      r.sessionToken = session.token

      const lastSeen = session.lastSeenAt?.getTime() ?? 0
      if (Date.now() - lastSeen > SLIDE_THROTTLE_MS) {
        // Slide expiry — keep user logged in as long as they're active.
        await db
          .update(userSessionsTable)
          .set({
            lastSeenAt: new Date(),
            expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          })
          .where(eq(userSessionsTable.token, token))
      }
    }
  } catch (err) {
    console.error("[auth] optionalAuth lookup failed:", err)
  }

  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const r = req as AuthedRequest
  if (!r.userId) {
    res.status(401).json({ error: "Authentication required" })
    return
  }
  next()
}
