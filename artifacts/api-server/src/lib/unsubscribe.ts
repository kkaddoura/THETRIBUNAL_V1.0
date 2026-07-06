import crypto from "node:crypto"

/**
 * Stateless HMAC-signed unsubscribe tokens so we don't need to store one-shot
 * tokens in the DB. Token payload is just the lowercased email; the signature
 * is the integrity check. Anyone who can guess a subscriber's email *and* the
 * secret could unsubscribe them — but that's the same protection any
 * email-only mailing list has, and the secret is server-side-only.
 *
 * Format: base64url(email).base64url(hmac)
 */

const DEV_SECRET = "dev-unsubscribe-secret-do-not-use-in-prod"

function getSecret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET
  if (s && s.length >= 16) return s
  if (process.env.NODE_ENV === "production") {
    throw new Error("UNSUBSCRIBE_SECRET must be set (>= 16 chars) in production")
  }
  return DEV_SECRET
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromB64url(s: string): Buffer {
  const pad = "=".repeat((4 - (s.length % 4)) % 4)
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64")
}

export function signUnsubscribeToken(email: string): string {
  const clean = email.trim().toLowerCase()
  const sig = crypto.createHmac("sha256", getSecret()).update(clean).digest()
  return `${b64url(clean)}.${b64url(sig)}`
}

export interface VerifyResult {
  ok: boolean
  email?: string
  reason?: string
}

export function verifyUnsubscribeToken(token: string | undefined): VerifyResult {
  if (!token || typeof token !== "string") return { ok: false, reason: "missing" }
  const [emailPart, sigPart] = token.split(".")
  if (!emailPart || !sigPart) return { ok: false, reason: "malformed" }
  let email: string
  try {
    email = fromB64url(emailPart).toString("utf8")
  } catch {
    return { ok: false, reason: "decode" }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: "bad_email" }
  const expected = crypto.createHmac("sha256", getSecret()).update(email).digest()
  let actual: Buffer
  try {
    actual = fromB64url(sigPart)
  } catch {
    return { ok: false, reason: "decode" }
  }
  if (expected.length !== actual.length) return { ok: false, reason: "sig_length" }
  if (!crypto.timingSafeEqual(expected, actual)) return { ok: false, reason: "sig_mismatch" }
  return { ok: true, email }
}

export function unsubscribeUrl(email: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3001").replace(/\/+$/, "")
  return `${base}/api/newsletter/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(email))}`
}
