/**
 * Resolves brand tokens from `designTokensTable` for the OG / press-kit /
 * newsletter renderers. Reads are cached for 60 seconds in-process.
 *
 * Token names are looked up in priority order with sensible fallbacks, so the
 * renderers keep working before the CMS is seeded with new OG-specific tokens.
 */

import { db, designTokensTable } from "@workspace/db"

export interface BrandTokens {
  bg: string
  fg: string
  accent: string
  muted: string
  border: string
  headingFont: string
  bodyFont: string
}

const FALLBACK: BrandTokens = {
  bg: "#0A0A0A",
  fg: "#F2EDE4",
  accent: "#DC143C",
  muted: "#9A9690",
  border: "#2A2A2A",
  headingFont: "Barlow Condensed",
  bodyFont: "Barlow",
}

const TTL_MS = 60_000
let cache: { tokens: BrandTokens; expiresAt: number } | null = null

function pick(byName: Map<string, string>, names: string[], fallback: string): string {
  for (const n of names) {
    const v = byName.get(n)
    if (v) return v
  }
  return fallback
}

export async function getBrandTokens(): Promise<BrandTokens> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.tokens

  let byName: Map<string, string>
  try {
    const rows = await db.select().from(designTokensTable)
    byName = new Map(rows.map((r: { name: string; value: string }) => [r.name, r.value]))
  } catch (err) {
    // DB unavailable shouldn't break image rendering — fall through to defaults.
    console.warn("[design-tokens-cache] db read failed, using fallbacks:", err)
    byName = new Map()
  }

  const resolved: BrandTokens = {
    bg: pick(byName, ["og-bg", "black-bg"], FALLBACK.bg),
    fg: pick(byName, ["og-fg", "off-white"], FALLBACK.fg),
    accent: pick(byName, ["og-accent", "crimson"], FALLBACK.accent),
    muted: pick(byName, ["og-muted"], FALLBACK.muted),
    border: pick(byName, ["og-border"], FALLBACK.border),
    headingFont: pick(byName, ["og-heading-font"], FALLBACK.headingFont),
    bodyFont: pick(byName, ["og-body-font"], FALLBACK.bodyFont),
  }

  cache = { tokens: resolved, expiresAt: now + TTL_MS }
  return resolved
}

export function clearBrandTokensCache(): void {
  cache = null
}

export const FALLBACK_TOKENS: Readonly<BrandTokens> = FALLBACK
