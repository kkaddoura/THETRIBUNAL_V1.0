/**
 * General user auth — signup, login, logout, me, vote-token linking.
 *
 * Distinct from CMS admin auth (cms.ts) and Majlis auth (majlis.ts).
 * Uses httpOnly cookie sessions (30-day sliding) instead of header tokens
 * because this is browser-mediated only.
 *
 * Vote merging:
 *  - signup links the current `voter_token` (sent by the client) to the new user
 *  - subsequent logins on new devices auto-link those device tokens too
 *  - duplicate-vote conflicts are silently kept to first-vote-wins
 */

import { Router, type Request, type Response } from "express"
import {
  db,
  usersTable,
  userSessionsTable,
  userVoterTokensTable,
  newsletterSubscribersTable,
  votesTable,
  predictionVotesTable,
} from "@workspace/db"
import { eq, sql, inArray } from "drizzle-orm"
import { hashPassword, verifyPassword, generateToken } from "../lib/auth-shared.js"
import { isValidAvatarId, AVATARS, getAvatarUrl } from "../lib/avatars.js"
import { validateUsername } from "../lib/reserved-usernames.js"
import { sendEmail } from "../lib/email.js"
import { unsubscribeUrl } from "../lib/unsubscribe.js"
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  optionalAuth,
  requireAuth,
  type AuthedRequest,
} from "../middlewares/auth.js"

const router = Router()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8

function isProd(): boolean {
  return process.env.NODE_ENV === "production"
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  })
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" })
}

async function createSession(userId: number): Promise<string> {
  const token = generateToken()
  await db.insert(userSessionsTable).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  })
  return token
}

interface PublicUserShape {
  id: number
  username: string
  email: string
  emailVerified: boolean
  avatarId: string
  avatarUrl: string | null
  newsletterOptIn: boolean
  createdAt: string
}

function toPublic(user: typeof usersTable.$inferSelect): PublicUserShape {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: user.emailVerified,
    avatarId: user.avatarId,
    avatarUrl: getAvatarUrl(user.avatarId),
    newsletterOptIn: user.newsletterOptIn,
    createdAt: user.createdAt.toISOString(),
  }
}

async function linkVoterTokenToUser(userId: number, voterToken: string | undefined): Promise<void> {
  if (!voterToken) return
  // Skip if already linked anywhere — first link wins (per plan: a token can
  // only ever belong to one user). ON CONFLICT NOTHING via unique index.
  try {
    await db
      .insert(userVoterTokensTable)
      .values({ userId, voterToken })
      .onConflictDoNothing()
  } catch (err) {
    console.warn("[auth] linkVoterToken failed:", err)
  }
}

// ── Signup ────────────────────────────────────────────────────

router.post("/auth/signup", async (req, res) => {
  const { username, email, password, avatarId, voterToken, newsletterOptIn } = req.body ?? {}

  // Input validation
  const usernameCheck = validateUsername(typeof username === "string" ? username : "")
  if (!usernameCheck.ok) {
    return res.status(400).json({
      error: "username_invalid",
      reason: usernameCheck.reason,
    })
  }
  if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "email_invalid" })
  }
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: "password_too_short" })
  }
  if (typeof avatarId !== "string" || !isValidAvatarId(avatarId)) {
    return res.status(400).json({ error: "avatar_invalid" })
  }

  const lowerUsername = username.toLowerCase()
  const lowerEmail = email.toLowerCase()

  // Uniqueness check (case-insensitive via lower() index)
  const existing = await db
    .select()
    .from(usersTable)
    .where(
      sql`lower(${usersTable.username}) = ${lowerUsername} or lower(${usersTable.email}) = ${lowerEmail}`,
    )
  if (existing.length > 0) {
    const conflict = existing[0]
    if (conflict.username.toLowerCase() === lowerUsername) {
      return res.status(409).json({ error: "username_taken" })
    }
    return res.status(409).json({ error: "email_taken" })
  }

  const passwordHash = await hashPassword(password)
  const verifyToken = generateToken()
  const wantsNewsletter = newsletterOptIn !== false // default true

  let user: typeof usersTable.$inferSelect
  try {
    const [created] = await db
      .insert(usersTable)
      .values({
        username,
        email,
        passwordHash,
        avatarId,
        emailVerificationToken: verifyToken,
        emailVerificationSentAt: new Date(),
        newsletterOptIn: wantsNewsletter,
      })
      .returning()
    user = created
  } catch (err) {
    console.error("[auth/signup] insert failed:", err)
    return res.status(500).json({ error: "signup_failed" })
  }

  // Auto-enroll into newsletter (opt-out flow per plan).
  if (wantsNewsletter) {
    try {
      await db
        .insert(newsletterSubscribersTable)
        .values({
          email: user.email,
          source: "signup",
          newsletterOptIn: true,
        })
        .onConflictDoNothing()
    } catch (err) {
      console.warn("[auth/signup] newsletter sync failed:", err)
    }
  }

  // Link the device's anonymous voter_token to this new user.
  await linkVoterTokenToUser(user.id, typeof voterToken === "string" ? voterToken : undefined)

  // Send verification + welcome emails (best-effort — never blocks signup).
  void sendVerificationEmail(user.email, verifyToken).catch((err) => {
    console.warn("[auth/signup] verification email failed:", err)
  })
  void sendWelcomeEmail(user.email, user.username).catch((err) => {
    console.warn("[auth/signup] welcome email failed:", err)
  })

  const sessionToken = await createSession(user.id)
  setSessionCookie(res, sessionToken)

  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id))

  return res.status(201).json({ user: toPublic(user) })
})

// ── Login ─────────────────────────────────────────────────────

router.post("/auth/login", async (req, res) => {
  const { username, password, voterToken } = req.body ?? {}
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "missing_credentials" })
  }

  const lower = username.toLowerCase()
  const candidates = await db
    .select()
    .from(usersTable)
    .where(sql`lower(${usersTable.username}) = ${lower} or lower(${usersTable.email}) = ${lower}`)

  if (candidates.length === 0) {
    return res.status(401).json({ error: "invalid_credentials" })
  }

  const user = candidates[0]
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) {
    return res.status(401).json({ error: "invalid_credentials" })
  }

  // Link this device's anonymous voter_token (no-op if already linked).
  await linkVoterTokenToUser(user.id, typeof voterToken === "string" ? voterToken : undefined)

  const sessionToken = await createSession(user.id)
  setSessionCookie(res, sessionToken)

  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id))

  return res.json({ user: toPublic(user) })
})

// ── Logout ────────────────────────────────────────────────────

router.post("/auth/logout", optionalAuth, async (req, res) => {
  const r = req as AuthedRequest
  const token = r.sessionToken
  if (token) {
    try {
      await db.delete(userSessionsTable).where(eq(userSessionsTable.token, token))
    } catch (err) {
      console.warn("[auth/logout] session delete failed:", err)
    }
  }
  clearSessionCookie(res)
  return res.json({ ok: true })
})

// ── Me ────────────────────────────────────────────────────────

router.get("/auth/me", optionalAuth, async (req, res) => {
  const r = req as AuthedRequest
  if (!r.userId) {
    return res.status(401).json({ error: "not_authenticated" })
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId))
  if (!user) return res.status(401).json({ error: "not_authenticated" })
  return res.json({ user: toPublic(user) })
})

// Activity stats for the logged-in user. Counts are derived from the voter
// tokens linked to this user (a single user can accumulate multiple tokens
// across devices). Cheap enough to compute on every request — both votes
// tables are indexed on voter_token.
router.get("/auth/me/stats", optionalAuth, requireAuth, async (req, res) => {
  const r = req as AuthedRequest
  const tokenRows = await db
    .select({ token: userVoterTokensTable.voterToken })
    .from(userVoterTokensTable)
    .where(eq(userVoterTokensTable.userId, r.userId!))
  const tokens = tokenRows.map((row) => row.token)

  if (tokens.length === 0) {
    return res.json({ pollVotes: 0, predictionVotes: 0 })
  }

  const [pollRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(votesTable)
    .where(inArray(votesTable.voterToken, tokens))
  const [predRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(predictionVotesTable)
    .where(inArray(predictionVotesTable.voterToken, tokens))

  return res.json({
    pollVotes: Number(pollRow?.count ?? 0),
    predictionVotes: Number(predRow?.count ?? 0),
  })
})

router.patch("/auth/me", optionalAuth, requireAuth, async (req, res) => {
  const r = req as AuthedRequest
  const { avatarId, newsletterOptIn } = req.body ?? {}
  const updates: Record<string, unknown> = {}
  if (typeof avatarId === "string") {
    if (!isValidAvatarId(avatarId)) {
      return res.status(400).json({ error: "avatar_invalid" })
    }
    updates.avatarId = avatarId
  }
  if (typeof newsletterOptIn === "boolean") {
    updates.newsletterOptIn = newsletterOptIn
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "no_changes" })
  }
  await db.update(usersTable).set(updates).where(eq(usersTable.id, r.userId!))
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId!))
  return res.json({ user: toPublic(user) })
})

// ── Link voter token (called on each authenticated app load from a new device) ──

router.post("/auth/link-voter-token", optionalAuth, requireAuth, async (req, res) => {
  const r = req as AuthedRequest
  const { voterToken } = req.body ?? {}
  if (typeof voterToken !== "string" || !voterToken) {
    return res.status(400).json({ error: "voter_token_required" })
  }
  await linkVoterTokenToUser(r.userId!, voterToken)
  return res.json({ ok: true })
})

// ── Email verification ────────────────────────────────────────

router.get("/auth/verify-email/:token", async (req, res) => {
  const token = req.params.token
  if (!token) return res.status(400).json({ error: "token_required" })
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.emailVerificationToken, token))
  if (!user) return res.status(400).json({ error: "invalid_or_used" })
  await db
    .update(usersTable)
    .set({ emailVerified: true, emailVerificationToken: null })
    .where(eq(usersTable.id, user.id))
  return res.json({ ok: true })
})

// ── Password reset ───────────────────────────────────────────
//
// Two-step flow:
//   1. POST /auth/forgot-password { email } → server generates a token,
//      stores it on the user row with a 1h expiry, sends an email via Resend.
//      Always returns 200 to avoid revealing whether the email exists.
//   2. POST /auth/reset-password { token, newPassword } → verifies token + expiry,
//      updates password_hash, clears the token. Invalidates all existing sessions
//      for safety (a forgotten password may indicate a compromised account).
//
// Per-email throttle: 3 requests per hour, enforced via password_reset_expires_at.

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
const RESET_THROTTLE_MS = 60 * 1000 // 1 minute between requests for the same email

router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body ?? {}
  if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    // Still return 200 to avoid distinguishing "bad email format" from "unknown email"
    return res.json({ ok: true })
  }
  const lower = email.toLowerCase()

  const [user] = await db
    .select()
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = ${lower}`)
  if (!user) return res.json({ ok: true }) // silent no-op for unknown email

  // Throttle: don't fire a fresh email if one was sent very recently.
  const lastReset = user.passwordResetExpiresAt?.getTime() ?? 0
  const lastResetSent = lastReset - RESET_TOKEN_TTL_MS // when token was issued
  if (Date.now() - lastResetSent < RESET_THROTTLE_MS) {
    return res.json({ ok: true })
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)
  await db
    .update(usersTable)
    .set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
    .where(eq(usersTable.id, user.id))

  void sendPasswordResetEmail(user.email, token).catch((err) => {
    console.warn("[auth/forgot-password] email failed:", err)
  })
  return res.json({ ok: true })
})

router.post("/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body ?? {}
  if (typeof token !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ error: "invalid_input" })
  }
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: "password_too_short" })
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.passwordResetToken, token))
  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    return res.status(400).json({ error: "invalid_or_expired" })
  }

  const passwordHash = await hashPassword(newPassword)
  await db
    .update(usersTable)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    })
    .where(eq(usersTable.id, user.id))

  // Invalidate all existing sessions — the old password is gone, treat any
  // active session as suspect.
  await db.delete(userSessionsTable).where(eq(userSessionsTable.userId, user.id))

  return res.json({ ok: true })
})

router.post("/auth/resend-verification", optionalAuth, requireAuth, async (req, res) => {
  const r = req as AuthedRequest
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId!))
  if (!user) return res.status(404).json({ error: "not_found" })
  if (user.emailVerified) return res.json({ ok: true })

  // Throttle: one resend per 60 seconds
  const lastSent = user.emailVerificationSentAt?.getTime() ?? 0
  if (Date.now() - lastSent < 60_000) {
    return res.status(429).json({ error: "rate_limited" })
  }

  const verifyToken = generateToken()
  await db
    .update(usersTable)
    .set({ emailVerificationToken: verifyToken, emailVerificationSentAt: new Date() })
    .where(eq(usersTable.id, user.id))
  void sendVerificationEmail(user.email, verifyToken).catch((err) => {
    console.warn("[auth/resend-verification] email failed:", err)
  })
  return res.json({ ok: true })
})

// ── Avatars ──────────────────────────────────────────────────

router.get("/auth/avatars", (_req, res) => {
  res.json({ avatars: AVATARS })
})

// ── Public user profile ──────────────────────────────────────

router.get("/users/:username/public", async (req, res) => {
  const username = (req.params.username ?? "").toLowerCase()
  if (!username) return res.status(400).json({ error: "username_required" })
  const [user] = await db
    .select()
    .from(usersTable)
    .where(sql`lower(${usersTable.username}) = ${username}`)
  if (!user) return res.status(404).json({ error: "not_found" })

  // Public-safe shape: avatar, username, join date, total vote count.
  // Per the plan's "hybrid visibility" decision, no per-poll history.
  const tokenRows = await db
    .select({ token: userVoterTokensTable.voterToken })
    .from(userVoterTokensTable)
    .where(eq(userVoterTokensTable.userId, user.id))

  let totalVotes = 0
  if (tokenRows.length > 0) {
    const tokenList = tokenRows.map((r: { token: string }) => r.token)
    const [{ count }] = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count FROM votes WHERE voter_token = ANY(${tokenList})`,
    ) as unknown as Array<{ count: number }>
    totalVotes = Number(count) || 0
  }

  return res.json({
    user: {
      username: user.username,
      avatarId: user.avatarId,
      avatarUrl: getAvatarUrl(user.avatarId),
      joinedAt: user.createdAt.toISOString(),
      totalVotes,
    },
  })
})

// ── Email helpers ────────────────────────────────────────────
//
// All transactional mail goes through Resend via the shared `sendEmail()`
// helper in lib/email.ts. The helper also writes to uploads/dev-emails/* when
// no RESEND_API_KEY is set, so signup flows are visibly verifiable locally.

const DEFAULT_APP_URL = "https://themiddleeasthustle.com"

async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const appUrl = process.env.APP_URL ?? DEFAULT_APP_URL
  const link = `${appUrl}/verify?token=${encodeURIComponent(token)}`
  const html = `<!DOCTYPE html>
<html>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #0A0A0A; color: #F2EDE4; margin: 0; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto; background: #0D0D0D; padding: 32px; border: 1px solid #2A2A2A;">
    <h1 style="font-size: 22px; letter-spacing: 1px; color: #F2EDE4; margin: 0 0 24px 0;">Verify your email</h1>
    <p style="font-size: 14px; line-height: 1.55; color: #C3BDB1;">Welcome to The Tribunal. Tap the button below to verify your email so we can keep your account safe.</p>
    <p style="margin: 28px 0;">
      <a href="${link}" style="display: inline-block; padding: 12px 28px; background: #DC143C; color: #FFFFFF; text-decoration: none; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-size: 13px;">Verify email</a>
    </p>
    <p style="font-size: 12px; color: #9A9690; line-height: 1.5;">If the button doesn't work, paste this link: <br /><a href="${link}" style="color: #9A9690;">${link}</a></p>
  </div>
</body>
</html>`

  await sendEmail({
    label: "verification",
    to: email,
    subject: "Verify your email — The Tribunal",
    html,
    listUnsubscribeUrl: unsubscribeUrl(email),
  })
}

async function sendWelcomeEmail(email: string, username: string): Promise<void> {
  const appUrl = process.env.APP_URL ?? DEFAULT_APP_URL
  const safeUsername = username.replace(/[<>&"']/g, "")
  const html = `<!DOCTYPE html>
<html>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #0A0A0A; color: #F2EDE4; margin: 0; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto; background: #0D0D0D; padding: 32px; border: 1px solid #2A2A2A;">
    <h1 style="font-size: 22px; letter-spacing: 1px; color: #F2EDE4; margin: 0 0 24px 0;">Welcome, ${safeUsername}.</h1>
    <p style="font-size: 14px; line-height: 1.55; color: #C3BDB1;">You're in. The Tribunal is where MENA's sharpest voices debate, predict, and shape narratives.</p>
    <p style="font-size: 14px; line-height: 1.55; color: #C3BDB1;">Start by casting a vote on a live debate or making a prediction — every action sharpens your standing.</p>
    <p style="margin: 28px 0;">
      <a href="${appUrl}" style="display: inline-block; padding: 12px 28px; background: #DC143C; color: #FFFFFF; text-decoration: none; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-size: 13px;">Enter the Tribunal</a>
    </p>
    <p style="font-size: 12px; color: #9A9690; line-height: 1.5;">Check your inbox for a separate verification email so we can keep your account safe.</p>
  </div>
</body>
</html>`

  await sendEmail({
    label: "welcome",
    to: email,
    subject: "Welcome to The Tribunal",
    html,
    listUnsubscribeUrl: unsubscribeUrl(email),
  })
}

async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const appUrl = process.env.APP_URL ?? DEFAULT_APP_URL
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`
  const html = `<!DOCTYPE html>
<html>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #0A0A0A; color: #F2EDE4; margin: 0; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto; background: #0D0D0D; padding: 32px; border: 1px solid #2A2A2A;">
    <h1 style="font-size: 22px; letter-spacing: 1px; color: #F2EDE4; margin: 0 0 24px 0;">Reset your password</h1>
    <p style="font-size: 14px; line-height: 1.55; color: #C3BDB1;">Someone — hopefully you — asked to reset your Tribunal password. The link below is valid for one hour.</p>
    <p style="margin: 28px 0;">
      <a href="${link}" style="display: inline-block; padding: 12px 28px; background: #DC143C; color: #FFFFFF; text-decoration: none; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-size: 13px;">Reset password</a>
    </p>
    <p style="font-size: 12px; color: #9A9690; line-height: 1.5;">If you didn't request this, ignore this email — your password stays the same.</p>
    <p style="font-size: 12px; color: #9A9690; line-height: 1.5;">If the button doesn't work, paste this link: <br /><a href="${link}" style="color: #9A9690;">${link}</a></p>
  </div>
</body>
</html>`

  await sendEmail({
    label: "password-reset",
    to: email,
    subject: "Reset your password — The Tribunal",
    html,
  })
}

export default router
