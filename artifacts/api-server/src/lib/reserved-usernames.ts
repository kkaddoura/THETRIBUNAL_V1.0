/**
 * Reserved usernames — refused at signup.
 *
 * The list is intentionally short. Two categories:
 *  - structural names that conflict with future routes / system surfaces
 *  - obvious impersonation handles (admin, support, etc.)
 *
 * Profanity blocking is intentionally light at v1: Arabic + English script-level
 * filtering would need a moderation pass we're not building yet. Tier-1 slurs
 * are blocked here; broader profanity should ship as a moderation queue later.
 */

const RESERVED = new Set([
  // Structural / system
  "admin",
  "administrator",
  "root",
  "system",
  "official",
  "team",
  "staff",
  "support",
  "help",
  "mod",
  "moderator",
  "owner",
  // Brand / namespace
  "tmh",
  "tribunal",
  "themiddleeasthustle",
  "middle-east-hustle",
  "middle_east_hustle",
  "hustle",
  "majlis",
  "voices",
  "pulse",
  "debates",
  "predictions",
  "press",
  "presskit",
  "press-kit",
  // Account-flow handles
  "me",
  "self",
  "you",
  "user",
  "anonymous",
  "guest",
  "test",
  // Simple tier-1 slurs (English) — a moderation queue should expand this.
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "nigger",
  "faggot",
  "kike",
  "retard",
])

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

export type UsernameValidation =
  | { ok: true }
  | { ok: false; reason: "format" | "reserved" | "profanity" }

export function validateUsername(username: string): UsernameValidation {
  if (!USERNAME_REGEX.test(username)) {
    return { ok: false, reason: "format" }
  }
  const lower = username.toLowerCase()
  if (RESERVED.has(lower)) {
    return { ok: false, reason: "reserved" }
  }
  // Substring profanity check
  for (const reserved of RESERVED) {
    if (reserved.length >= 4 && lower.includes(reserved)) {
      return { ok: false, reason: "profanity" }
    }
  }
  return { ok: true }
}
