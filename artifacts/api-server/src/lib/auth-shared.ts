/**
 * Shared auth primitives — used by general user auth and the existing
 * Majlis / CMS auth surfaces.
 */

import bcrypt from "bcryptjs"
import crypto from "crypto"

const BCRYPT_ROUNDS = 10

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function generateShortCode(): string {
  // 6-character base32 code for email verification UX (manual fallback).
  return crypto.randomBytes(4).toString("base64url").slice(0, 6).toUpperCase()
}
